#!/usr/bin/env python3
"""Convert selected frames into transparent 256x256 cells and a horizontal sprite strip."""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name)]


def image_files(source_dir: Path) -> list[Path]:
    return sorted([path for path in source_dir.iterdir() if path.suffix.lower() == ".png"], key=natural_key)


def parse_hex_color(value: str) -> tuple[int, int, int]:
    value = value.strip().lstrip("#")
    if len(value) != 6:
        raise ValueError(f"Expected 6-digit hex color, got {value}")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def chroma_to_alpha(image: Image.Image, key: tuple[int, int, int], tolerance: int) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    kr, kg, kb = key
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            distance = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
            green_screen = g > 180 and r < 120 and b < 140 and g > max(r, b) + 45
            if distance <= tolerance or green_screen:
                pixels[x, y] = (r, g, b, 0)
            elif g > max(r, b) + 24:
                pixels[x, y] = (r, max(r, b) + 10, b, a)
    return rgba


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def remove_small_alpha_components(image: Image.Image, min_area: int) -> Image.Image:
    if min_area <= 0:
        return image
    width, height = image.size
    alpha = image.getchannel("A")
    alpha_pixels = alpha.load()
    rgba = image.load()
    visited: set[tuple[int, int]] = set()
    for y in range(height):
        for x in range(width):
            if (x, y) in visited or alpha_pixels[x, y] == 0:
                continue
            queue = deque([(x, y)])
            component: list[tuple[int, int]] = []
            visited.add((x, y))
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited and alpha_pixels[nx, ny] > 0:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            if len(component) < min_area:
                for px, py in component:
                    r, g, b, _ = rgba[px, py]
                    rgba[px, py] = (r, g, b, 0)
    return image


def fit_preserve_canvas(image: Image.Image, frame_size: int) -> tuple[Image.Image, dict]:
    source_w, source_h = image.size
    scale = min(frame_size / source_w, frame_size / source_h)
    scaled_w = max(1, round(source_w * scale))
    scaled_h = max(1, round(source_h * scale))
    resized = image.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    paste = ((frame_size - scaled_w) // 2, (frame_size - scaled_h) // 2)
    cell.paste(resized, paste, resized)
    return cell, {
        "source_canvas_size": [source_w, source_h],
        "scale": scale,
        "scaled_canvas_size": [scaled_w, scaled_h],
        "paste_location": list(paste),
    }


def fit_foreground(image: Image.Image, frame_size: int, padding: int) -> tuple[Image.Image, dict]:
    bbox = alpha_bbox(image)
    if bbox is None:
        return Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0)), {"source_canvas_size": list(image.size)}
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    cropped = image.crop((left, top, right, bottom))
    scale = min(frame_size / cropped.width, frame_size / cropped.height)
    scaled_w = max(1, round(cropped.width * scale))
    scaled_h = max(1, round(cropped.height * scale))
    resized = cropped.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    paste = ((frame_size - scaled_w) // 2, (frame_size - scaled_h) // 2)
    cell.paste(resized, paste, resized)
    return cell, {
        "source_canvas_size": list(image.size),
        "foreground_crop": [left, top, right, bottom],
        "scale": scale,
        "scaled_canvas_size": [scaled_w, scaled_h],
        "paste_location": list(paste),
    }


def edge_alpha_count(image: Image.Image) -> int:
    alpha = image.getchannel("A")
    width, height = image.size
    count = 0
    for x in range(width):
        count += alpha.getpixel((x, 0)) > 0
        count += alpha.getpixel((x, height - 1)) > 0
    for y in range(height):
        count += alpha.getpixel((0, y)) > 0
        count += alpha.getpixel((width - 1, y)) > 0
    return int(count)


def silhouette_diff(a: Image.Image, b: Image.Image) -> float:
    aa = a.getchannel("A").resize((64, 64), Image.Resampling.NEAREST)
    bb = b.getchannel("A").resize((64, 64), Image.Resampling.NEAREST)
    changed = 0
    for y in range(64):
        for x in range(64):
            changed += (aa.getpixel((x, y)) > 0) != (bb.getpixel((x, y)) > 0)
    return round(changed / (64 * 64), 4)


def make_checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGB", size, "#ffffff")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle([x, y, x + cell - 1, y + cell - 1], fill="#d9e3e8")
    return image


def clear_box(image: Image.Image, box: str) -> None:
    x0, y0, x1, y1 = [int(part) for part in box.split(",")]
    pixels = image.load()
    for y in range(max(0, y0), min(image.height, y1)):
        for x in range(max(0, x0), min(image.width, x1)):
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-frames-dir", required=True)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--preview", required=True)
    parser.add_argument("--frames-dir", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--background-mode", choices=["chroma", "alpha"], default="chroma")
    parser.add_argument("--chroma-key", default="#00FF00")
    parser.add_argument("--chroma-tolerance", type=int, default=48)
    parser.add_argument("--layout-mode", choices=["preserve-canvas", "fit-foreground"], default="preserve-canvas")
    parser.add_argument("--frame-size", type=int, default=256)
    parser.add_argument("--frame-prefix", required=True)
    parser.add_argument("--noise-min-area", type=int, default=8)
    parser.add_argument("--fit-padding", type=int, default=18)
    parser.add_argument("--clear-box", help="Optional x0,y0,x1,y1 transparent cleanup rectangle in each cell")
    args = parser.parse_args()

    source_dir = Path(args.source_frames_dir)
    frame_paths = image_files(source_dir)
    errors: list[str] = []
    warnings: list[str] = []
    if len(frame_paths) != args.frames:
        errors.append(f"Expected {args.frames} frames, found {len(frame_paths)}")
    if not frame_paths:
        raise SystemExit("No PNG frames to process")

    output_path = Path(args.output)
    preview_path = Path(args.preview)
    frames_dir = Path(args.frames_dir)
    report_path = Path(args.report)
    for path in (output_path.parent, preview_path.parent, frames_dir, report_path.parent):
        path.mkdir(parents=True, exist_ok=True)

    key = parse_hex_color(args.chroma_key)
    cells: list[Image.Image] = []
    frame_reports: list[dict] = []

    for index, frame_path in enumerate(frame_paths[: args.frames], start=1):
        image = Image.open(frame_path).convert("RGBA")
        if args.background_mode == "chroma":
            image = chroma_to_alpha(image, key, args.chroma_tolerance)
        image = remove_small_alpha_components(image, args.noise_min_area)

        if args.layout_mode == "preserve-canvas":
            cell, layout = fit_preserve_canvas(image, args.frame_size)
        else:
            cell, layout = fit_foreground(image, args.frame_size, args.fit_padding)
            warnings.append("fit-foreground can create animation jitter; prefer preserve-canvas for video sprites")

        if args.clear_box:
            clear_box(cell, args.clear_box)

        bbox = alpha_bbox(cell)
        edge_count = edge_alpha_count(cell)
        if edge_count:
            warnings.append(f"Frame {index} has {edge_count} alpha pixels touching the cell edge")

        frame_output = frames_dir / f"{args.frame_prefix}_{index:02d}.png"
        cell.save(frame_output)
        cells.append(cell)
        frame_reports.append({
            "index": index,
            "source": str(frame_path),
            "output": str(frame_output),
            **layout,
            "final_bounding_box": list(bbox) if bbox else None,
            "source_edge_alpha_count": edge_count,
        })

    sheet = Image.new("RGBA", (args.frame_size * len(cells), args.frame_size), (0, 0, 0, 0))
    for index, cell in enumerate(cells):
        sheet.paste(cell, (index * args.frame_size, 0), cell)
    sheet.save(output_path)

    preview = make_checker(sheet.size)
    preview.paste(sheet, (0, 0), sheet)
    preview.save(preview_path)

    diffs = [silhouette_diff(cells[i - 1], cells[i]) for i in range(1, len(cells))]
    duplicates = [i + 1 for i, diff in enumerate(diffs, start=1) if diff < 0.01]
    pops = [i + 1 for i, diff in enumerate(diffs, start=1) if diff > 0.38]
    if duplicates:
        warnings.append(f"Possible duplicate-looking frame transitions after frames: {duplicates}")
    if pops:
        warnings.append(f"Possible motion pops after frames: {pops}")

    report = {
        "status": "fail" if errors else "pass",
        "errors": errors,
        "warnings": sorted(set(warnings)),
        "frame_count": len(cells),
        "frame_size": args.frame_size,
        "sheet_size": list(sheet.size),
        "source_frames_dir": str(source_dir),
        "output": str(output_path),
        "preview": str(preview_path),
        "frames_dir": str(frames_dir),
        "background_mode": args.background_mode,
        "layout_mode": args.layout_mode,
        "adjacent_frame_silhouette_differences": diffs,
        "possible_duplicate_frames": duplicates,
        "possible_motion_pops": pops,
        "frames": frame_reports,
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote sheet: {output_path}")
    print(f"Report status: {report['status']}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
