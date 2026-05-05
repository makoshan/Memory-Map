#!/usr/bin/env python3
"""Copy selected source frames into an ordered animation folder."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name)]


def image_files(source_dir: Path) -> list[Path]:
    return sorted([path for path in source_dir.iterdir() if path.suffix.lower() == ".png"], key=natural_key)


def parse_indices(value: str) -> list[int]:
    indices: list[int] = []
    for chunk in value.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            start, end = [int(part.strip()) for part in chunk.split("-", 1)]
            if end < start:
                raise ValueError(f"Invalid descending range: {chunk}")
            indices.extend(range(start, end + 1))
        else:
            indices.append(int(chunk))
    return indices


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--indices", required=True)
    parser.add_argument("--frame-prefix", required=True)
    parser.add_argument("--notes", default="")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    output_dir = Path(args.output_dir)
    frames = image_files(source_dir)
    indices = parse_indices(args.indices)
    notes = [note.strip() for note in args.notes.split(",")] if args.notes else []

    if not frames:
        raise SystemExit(f"No PNG frames found in {source_dir}")
    for index in indices:
        if index < 1 or index > len(frames):
            raise SystemExit(f"Frame index {index} out of range 1-{len(frames)}")

    output_dir.mkdir(parents=True, exist_ok=True)
    if args.overwrite:
        for path in output_dir.glob(f"{args.frame_prefix}_*.png"):
            path.unlink()

    mapping = []
    for output_index, source_index in enumerate(indices, start=1):
        source_path = frames[source_index - 1]
        output_path = output_dir / f"{args.frame_prefix}_{output_index:04d}.png"
        shutil.copy2(source_path, output_path)
        mapping.append({
            "output_index": output_index,
            "output_path": str(output_path),
            "source_index": source_index,
            "source_path": str(source_path),
            "note": notes[output_index - 1] if output_index <= len(notes) else "selected",
        })

    report = {
        "source_dir": str(source_dir),
        "output_dir": str(output_dir),
        "total_source_frame_count": len(frames),
        "selected_frame_count": len(indices),
        "selected_source_indices": indices,
        "frames": mapping,
    }
    (output_dir / "selection_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Selected {len(indices)} frames into {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
