#!/usr/bin/env python3
"""Extract full-resolution PNG frames from a video with ffmpeg."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


def run_json(command: list[str]) -> dict:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(result.stdout or "{}")


def count_frames(output_dir: Path, glob_pattern: str) -> int:
    return len(sorted(output_dir.glob(glob_pattern.replace("%04d", "*"))))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--fps")
    parser.add_argument("--crop")
    parser.add_argument("--pattern", default="frame_%04d.png")
    parser.add_argument("--start-number", type=int, default=1)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    if not input_path.exists():
        raise SystemExit(f"Input video not found: {input_path}")
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise SystemExit("ffmpeg and ffprobe must be installed on PATH")

    output_dir.mkdir(parents=True, exist_ok=True)
    if args.overwrite:
        for frame in output_dir.glob(args.pattern.replace("%04d", "*")):
            frame.unlink()

    metadata = run_json([
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,duration",
        "-show_format",
        "-of",
        "json",
        str(input_path),
    ])

    filters: list[str] = []
    if args.crop:
        filters.append(f"crop={args.crop}")
    if args.fps:
        filters.append(f"fps={args.fps}")

    command = ["ffmpeg", "-hide_banner", "-loglevel", "error"]
    if args.overwrite:
        command.append("-y")
    command += ["-i", str(input_path)]
    if filters:
        command += ["-vf", ",".join(filters)]
    command += ["-start_number", str(args.start_number), str(output_dir / args.pattern)]

    subprocess.run(command, check=True)
    extracted_count = count_frames(output_dir, args.pattern)

    report = {
        "input": str(input_path),
        "output_dir": str(output_dir),
        "output_pattern": args.pattern,
        "requested_fps": args.fps,
        "crop": args.crop,
        "mode": "constant-fps" if args.fps else "source-frame-passthrough",
        "source_metadata": metadata,
        "extracted_frame_count": extracted_count,
        "ffmpeg_command": command,
    }
    (output_dir / "extraction_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Extracted {extracted_count} frames to {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
