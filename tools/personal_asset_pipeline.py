#!/usr/bin/env python3
"""Generate a personal Layer 3 asset from prompt JSON, video output, and the local sprite pipeline."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"


def slugify(value: str, fallback: str = "asset") -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or fallback


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def run_command(command: list[str]) -> None:
    print("$ " + " ".join(command))
    subprocess.run(command, cwd=ROOT, check=True)


def run_capture(command: list[str]) -> str:
    print("$ " + " ".join(command))
    completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    output = "\n".join(part for part in (completed.stdout.strip(), completed.stderr.strip()) if part)
    if output:
        print(output)
    if completed.returncode != 0:
        raise RuntimeError(f"Command exited {completed.returncode}: {' '.join(command)}\n{output}")
    return output


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name)]


def png_frames(path: Path) -> list[Path]:
    return sorted([item for item in path.iterdir() if item.suffix.lower() == ".png"], key=natural_key)


def evenly_spaced_indices(total: int, count: int) -> list[int]:
    if total <= 0:
        raise ValueError("Cannot select frames from an empty extraction folder")
    if count <= 1:
        return [1]
    if total == 1:
        return [1] * count
    return [1 + round(index * (total - 1) / (count - 1)) for index in range(count)]


def http_json(method: str, url: str, api_key: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = json.dumps(body or {}).encode("utf-8") if body is not None else None
    request = urllib.request.Request(url, data=payload, method=method.upper())
    request.add_header("Authorization", f"Bearer {api_key}")
    request.add_header("Content-Type", "application/json")
    request.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: HTTP {error.code}: {detail}") from error


def nested_get(data: Any, keys: list[str]) -> Any:
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def find_first_value(data: Any, names: set[str]) -> Any:
    if isinstance(data, dict):
        for key, value in data.items():
            if key in names and value:
                return value
        for value in data.values():
            found = find_first_value(value, names)
            if found:
                return found
    if isinstance(data, list):
        for value in data:
            found = find_first_value(value, names)
            if found:
                return found
    return None


def normalize_status(data: dict[str, Any]) -> str:
    value = (
        data.get("status")
        or data.get("task_status")
        or nested_get(data, ["data", "status"])
        or nested_get(data, ["data", "task_status"])
        or nested_get(data, ["result", "status"])
        or ""
    )
    return str(value).lower()


def create_kling_task(spec: dict[str, Any], prompt_text: str) -> tuple[str, dict[str, Any]]:
    generation = spec.get("generation", {})
    base_url = str(generation.get("api_base_url", "https://api.klingai.com")).rstrip("/")
    api_key_env = str(generation.get("api_key_env", "KLING_API_KEY"))
    api_key = os.environ.get(api_key_env, "")
    if not api_key:
        raise RuntimeError(f"Missing {api_key_env}. Export it before calling the Kling provider.")

    mode = str(generation.get("mode", "image2video"))
    endpoint_name = "image2video" if mode == "image2video" else "text2video"
    endpoint = str(generation.get("create_endpoint", f"/v1/videos/{endpoint_name}"))
    url = urllib.parse.urljoin(base_url + "/", endpoint.lstrip("/"))

    body: dict[str, Any] = {
        "model": generation.get("model"),
        "prompt": prompt_text,
        "negative_prompt": generation.get("negative_prompt"),
        "duration": generation.get("duration"),
        "aspect_ratio": generation.get("aspect_ratio"),
        "mode": generation.get("quality_mode") or generation.get("render_mode"),
    }
    if mode == "image2video":
        image_url = generation.get("image_url")
        if not image_url:
            raise RuntimeError("image2video requires generation.image_url. Upload or host the first frame before calling Kling.")
        body["image_url"] = image_url
    body = {key: value for key, value in body.items() if value is not None}
    body.update(generation.get("request_overrides", {}))

    response = http_json("POST", url, api_key, body)
    task_id = (
        response.get("task_id")
        or nested_get(response, ["data", "task_id"])
        or nested_get(response, ["data", "id"])
        or response.get("id")
    )
    if not task_id:
        raise RuntimeError(f"Kling create response did not include a task id: {json.dumps(response, ensure_ascii=False)[:800]}")
    return str(task_id), {"url": url, "request": {**body, "prompt": prompt_text}, "response": response}


def poll_kling_task(spec: dict[str, Any], task_id: str, poll_seconds: int, timeout_seconds: int) -> tuple[str, list[dict[str, Any]]]:
    generation = spec.get("generation", {})
    base_url = str(generation.get("api_base_url", "https://api.klingai.com")).rstrip("/")
    api_key_env = str(generation.get("api_key_env", "KLING_API_KEY"))
    api_key = os.environ.get(api_key_env, "")
    endpoint_template = str(generation.get("status_endpoint", "/v1/videos/{task_id}"))
    url = urllib.parse.urljoin(base_url + "/", endpoint_template.format(task_id=urllib.parse.quote(task_id)).lstrip("/"))
    deadline = time.time() + timeout_seconds
    snapshots: list[dict[str, Any]] = []
    success = {"succeeded", "success", "completed", "complete", "done", "finished"}
    failure = {"failed", "failure", "error", "cancelled", "canceled"}

    while time.time() < deadline:
        response = http_json("GET", url, api_key)
        snapshots.append(response)
        status = normalize_status(response)
        if status in success:
            video_url = find_first_value(response, {"video_url", "url", "download_url", "file_url"})
            if not video_url:
                raise RuntimeError(f"Kling task completed but no video URL was found: {json.dumps(response, ensure_ascii=False)[:800]}")
            return str(video_url), snapshots
        if status in failure:
            raise RuntimeError(f"Kling task failed: {json.dumps(response, ensure_ascii=False)[:800]}")
        time.sleep(poll_seconds)

    raise TimeoutError(f"Kling task {task_id} did not finish within {timeout_seconds} seconds")


def download_file(url: str, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as response:
        output.write_bytes(response.read())


def find_cli() -> str:
    for name in ("dreamina", "dreamina_cli", "dreamina-cli"):
        path = shutil.which(name)
        if path:
            return path
    fallback = Path.home() / ".local" / "bin" / "dreamina"
    if fallback.exists():
        return str(fallback)
    raise RuntimeError("dreamina CLI not found. Install/login with dreamina before using provider=dreamina_cli.")


def parse_submit_id(output: str) -> str:
    try:
        parsed = json.loads(output)
        found = find_first_value(parsed, {"submit_id", "submitId", "task_id", "taskId", "id"})
        if found:
            return str(found)
    except json.JSONDecodeError:
        pass

    patterns = [
        r'"(?:submit_id|submitId|task_id|taskId|id)"\s*:\s*"([^"]+)"',
        r"(?:submit_id|submit id|submitId|task_id|task id|taskId|id)\s*[:=]\s*([A-Za-z0-9._:-]+)",
        r"\b([0-9a-fA-F]{12,}(?:-[0-9a-fA-F]{4,})*)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, output, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    raise RuntimeError(f"Could not parse Dreamina submit_id from output: {output[:1000]}")


def newest_video_file(folder: Path, since: float) -> Path | None:
    video_exts = {".mp4", ".mov", ".webm", ".m4v"}
    candidates = [
        path
        for path in folder.rglob("*")
        if path.is_file() and path.suffix.lower() in video_exts and path.stat().st_mtime >= since
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda path: path.stat().st_mtime)


def generate_dreamina_video(spec: dict[str, Any], run_dir: Path, prompt_text: str, poll_seconds: int, timeout_seconds: int) -> tuple[Path, dict[str, Any]]:
    generation = spec.get("generation", {})
    mode = str(generation.get("mode", "image2video"))
    cli = str(generation.get("cli_path") or find_cli())
    download_dir = run_dir / "dreamina_downloads"
    download_dir.mkdir(parents=True, exist_ok=True)

    command = [cli, mode]
    if mode == "image2video":
        first_frame = generation.get("first_frame_image") or generation.get("image") or generation.get("image_path")
        if not first_frame:
            raise RuntimeError("dreamina_cli image2video requires generation.first_frame_image, usually produced by Codex image2.")
        first_frame_path = Path(str(first_frame)).expanduser().resolve()
        if not first_frame_path.exists():
            raise FileNotFoundError(first_frame_path)
        command.append(f"--image={first_frame_path}")
    elif mode == "text2video":
        pass
    elif mode == "frames2video":
        first = generation.get("first_frame_image") or generation.get("first")
        last = generation.get("last_frame_image") or generation.get("last")
        if not first or not last:
            raise RuntimeError("dreamina_cli frames2video requires generation.first_frame_image and generation.last_frame_image.")
        command.extend([f"--first={Path(str(first)).expanduser().resolve()}", f"--last={Path(str(last)).expanduser().resolve()}"])
    else:
        raise RuntimeError(f"Unsupported dreamina_cli mode: {mode}")

    command.append(f"--prompt={prompt_text}")
    for json_key, cli_key in (
        ("duration", "duration"),
        ("ratio", "ratio"),
        ("video_resolution", "video_resolution"),
        ("model_version", "model_version"),
        ("session", "session"),
    ):
        if generation.get(json_key) is not None:
            command.append(f"--{cli_key}={generation[json_key]}")
    command.append(f"--poll={int(generation.get('initial_poll_seconds', 0))}")

    submitted_at = time.time()
    submit_output = run_capture(command)
    submit_id = parse_submit_id(submit_output)
    snapshots = [{"phase": "submit", "output": submit_output}]
    deadline = time.time() + timeout_seconds

    while time.time() < deadline:
        query_output = run_capture([cli, "query_result", f"--submit_id={submit_id}", f"--download_dir={download_dir}"])
        snapshots.append({"phase": "query", "output": query_output})
        video = newest_video_file(download_dir, submitted_at)
        if video:
            target = run_dir / "source_videos" / f"{slugify(spec.get('asset_id', submit_id))}{video.suffix.lower()}"
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(video, target)
            return target, {
                "provider": "dreamina_cli",
                "mode": mode,
                "submit_id": submit_id,
                "download_dir": str(download_dir),
                "downloaded_to": str(target),
                "snapshots": snapshots,
            }
        lowered = query_output.lower()
        if any(token in lowered for token in ("failed", "failure", "error", "失败")):
            raise RuntimeError(f"Dreamina task failed: {query_output[:1000]}")
        time.sleep(poll_seconds)

    raise TimeoutError(f"Dreamina task {submit_id} did not download a video within {timeout_seconds} seconds")


def get_video(spec: dict[str, Any], run_dir: Path, prompt_text: str, source_video: str | None, poll_seconds: int, timeout_seconds: int) -> tuple[Path, dict[str, Any]]:
    if source_video:
        source = Path(source_video).expanduser().resolve()
        if not source.exists():
            raise FileNotFoundError(source)
        target = run_dir / "source_videos" / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        return target, {"provider": "local_source_video", "source": str(source), "copied_to": str(target)}

    generation = spec.get("generation", {})
    if generation.get("source_video"):
        return get_video(spec, run_dir, prompt_text, str(generation["source_video"]), poll_seconds, timeout_seconds)

    provider = str(generation.get("provider", "dreamina_cli"))
    if provider == "dreamina_cli":
        return generate_dreamina_video(spec, run_dir, prompt_text, poll_seconds, timeout_seconds)
    if provider != "kling":
        raise RuntimeError(f"Unsupported provider: {provider}")

    task_id, create_report = create_kling_task(spec, prompt_text)
    video_url, snapshots = poll_kling_task(spec, task_id, poll_seconds, timeout_seconds)
    output = run_dir / "source_videos" / f"{slugify(spec.get('asset_id', task_id))}.mp4"
    download_file(video_url, output)
    return output, {
        "provider": "kling",
        "task_id": task_id,
        "create": create_report,
        "poll_count": len(snapshots),
        "final_response": snapshots[-1] if snapshots else None,
        "video_url": video_url,
        "downloaded_to": str(output),
    }


def update_godot_generated_manifest(entry: dict[str, Any]) -> Path:
    manifest_path = ROOT / "godot" / "data" / "generated_assets_manifest.json"
    if manifest_path.exists():
        manifest = read_json(manifest_path)
    else:
        manifest = {"assets": []}
    assets = [item for item in manifest.get("assets", []) if item.get("asset_id") != entry.get("asset_id")]
    assets.insert(0, entry)
    manifest["assets"] = assets
    manifest["updated_at"] = datetime.now().isoformat(timespec="seconds")
    write_json(manifest_path, manifest)
    return manifest_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", required=True, help="Path to a personal asset prompt JSON")
    parser.add_argument("--source-video", help="Use an already downloaded video instead of calling the provider")
    parser.add_argument("--run-dir", help="Override work run directory")
    parser.add_argument("--poll-seconds", type=int, default=8)
    parser.add_argument("--timeout-seconds", type=int, default=900)
    parser.add_argument("--skip-godot-copy", action="store_true")
    args = parser.parse_args()

    prompt_path = Path(args.prompt).expanduser().resolve()
    spec = read_json(prompt_path)
    animation = spec.get("animation", {})
    pipeline = spec.get("pipeline", {})

    user_slug = slugify(str(spec.get("user_id") or spec.get("character", {}).get("name") or "user"), "user")
    asset_slug = slugify(str(spec.get("asset_id") or spec.get("character", {}).get("name") or "asset"), "asset")
    animation_slug = slugify(str(animation.get("name", "animation")), "animation")
    frame_count = int(animation.get("frame_count") or pipeline.get("frame_count") or 12)
    frame_size = int(pipeline.get("frame_size", 256))
    frame_prefix = f"{asset_slug}_{animation_slug}_{frame_count}f"
    prompt_text = str(animation.get("prompt") or spec.get("generation", {}).get("prompt") or "")
    if not prompt_text:
        raise RuntimeError("Missing animation.prompt. The video provider needs explicit motion constraints.")

    run_dir = Path(args.run_dir).expanduser().resolve() if args.run_dir else ROOT / "work" / "runs" / "personal_assets" / f"{datetime.now().strftime('%Y%m%d-%H%M%S')}_{asset_slug}"
    run_dir.mkdir(parents=True, exist_ok=True)
    write_json(run_dir / "prompt_used.json", spec)

    video_path, generation_report = get_video(spec, run_dir, prompt_text, args.source_video, args.poll_seconds, args.timeout_seconds)

    extracted_dir = run_dir / "extracted" / user_slug / asset_slug / animation_slug
    extract_cmd = [
        sys.executable,
        str(TOOLS / "extract_frames_ffmpeg.py"),
        "--input",
        str(video_path),
        "--output-dir",
        str(extracted_dir),
        "--overwrite",
    ]
    if pipeline.get("fps"):
        extract_cmd.extend(["--fps", str(pipeline["fps"])])
    if pipeline.get("crop"):
        extract_cmd.extend(["--crop", str(pipeline["crop"])])
    run_command(extract_cmd)

    extracted_frames = png_frames(extracted_dir)
    contact_sheet = run_dir / "contact_sheets" / f"{asset_slug}_{animation_slug}_raw_contact.png"
    run_command([
        sys.executable,
        str(TOOLS / "make_contact_sheet.py"),
        "--source-dir",
        str(extracted_dir),
        "--output",
        str(contact_sheet),
        "--cols",
        str(pipeline.get("contact_sheet_cols", 12)),
        "--cell-size",
        str(pipeline.get("contact_sheet_cell_size", 128)),
        "--image-size",
        str(pipeline.get("contact_sheet_image_size", 112)),
    ])

    frame_indices = pipeline.get("frame_indices") or evenly_spaced_indices(len(extracted_frames), frame_count)
    indices_text = ",".join(str(index) for index in frame_indices)
    selected_dir = run_dir / "selected" / user_slug / asset_slug / animation_slug / f"{frame_count}f"
    notes = pipeline.get("frame_notes") or ["auto-selected"] * len(frame_indices)
    run_command([
        sys.executable,
        str(TOOLS / "select_frames.py"),
        "--source-dir",
        str(extracted_dir),
        "--output-dir",
        str(selected_dir),
        "--indices",
        indices_text,
        "--frame-prefix",
        frame_prefix,
        "--notes",
        ",".join(str(note) for note in notes),
        "--overwrite",
    ])

    final_root = ROOT / "final_sprites" / user_slug / asset_slug / animation_slug
    final_sheet = final_root / "sheets" / f"{frame_prefix}_{frame_size}.png"
    final_frames = final_root / "frames" / f"{frame_count}f_{frame_size}"
    preview = run_dir / "previews" / f"{frame_prefix}_{frame_size}_preview.png"
    report = run_dir / "reports" / f"{frame_prefix}_{frame_size}_report.json"
    pipeline_cmd = [
        sys.executable,
        str(TOOLS / "animation_pipeline.py"),
        "--source-frames-dir",
        str(selected_dir),
        "--frames",
        str(frame_count),
        "--output",
        str(final_sheet),
        "--preview",
        str(preview),
        "--frames-dir",
        str(final_frames),
        "--report",
        str(report),
        "--background-mode",
        str(pipeline.get("background_mode", "chroma")),
        "--layout-mode",
        str(pipeline.get("layout_mode", "preserve-canvas")),
        "--frame-size",
        str(frame_size),
        "--frame-prefix",
        frame_prefix,
        "--chroma-key",
        str(pipeline.get("chroma_key", "#00FF00")),
    ]
    if pipeline.get("clear_box"):
        pipeline_cmd.extend(["--clear-box", str(pipeline["clear_box"])])
    run_command(pipeline_cmd)

    run_command([
        sys.executable,
        str(TOOLS / "build_sprite_gallery_manifest.py"),
        "--folder",
        str(ROOT / "final_sprites"),
        "--output",
        str(ROOT / "sprite_gallery_manifest.js"),
    ])

    godot_entry: dict[str, Any] | None = None
    if bool(pipeline.get("copy_to_godot", True)) and not args.skip_godot_copy:
        godot_dir = ROOT / "godot" / "assets" / "generated" / user_slug / asset_slug / animation_slug
        godot_sheet = godot_dir / final_sheet.name
        godot_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(final_sheet, godot_sheet)
        godot_entry = {
            "asset_id": spec.get("asset_id", asset_slug),
            "user_id": spec.get("user_id", user_slug),
            "kind": spec.get("kind", "character_animation"),
            "animation": animation_slug,
            "frame_count": frame_count,
            "frame_size": frame_size,
            "fps": int(animation.get("fps", frame_count)),
            "sheet": "res://" + godot_sheet.relative_to(ROOT / "godot").as_posix(),
            "final_sheet": final_sheet.relative_to(ROOT).as_posix(),
            "semantic_tags": spec.get("layer1", {}).get("semantic_tags", []),
            "created_at": datetime.now().isoformat(timespec="seconds"),
        }
        update_godot_generated_manifest(godot_entry)

    final_report = {
        "status": "complete",
        "prompt": str(prompt_path),
        "run_dir": str(run_dir),
        "generation": generation_report,
        "contact_sheet": str(contact_sheet),
        "selected_indices": frame_indices,
        "sprite_sheet": str(final_sheet),
        "frames_dir": str(final_frames),
        "preview": str(preview),
        "pipeline_report": str(report),
        "godot": godot_entry,
    }
    final_report_path = run_dir / "asset_generation_report.json"
    write_json(final_report_path, final_report)
    print(f"Wrote asset generation report: {final_report_path}")
    print(f"Final sprite sheet: {final_sheet}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
