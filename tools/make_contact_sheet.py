#!/usr/bin/env python3
"""Build a numbered contact sheet from extracted animation frames."""

from __future__ import annotations

import argparse
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name)]


def image_files(source_dir: Path) -> list[Path]:
    return sorted(
        [path for path in source_dir.iterdir() if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}],
        key=natural_key,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--cols", type=int, default=12)
    parser.add_argument("--cell-size", type=int, default=128)
    parser.add_argument("--image-size", type=int, default=112)
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    output = Path(args.output)
    frames = image_files(source_dir)
    if not frames:
        raise SystemExit(f"No frames found in {source_dir}")

    rows = math.ceil(len(frames) / args.cols)
    sheet = Image.new("RGB", (args.cols * args.cell_size, rows * args.cell_size), "#f7f7f7")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, frame_path in enumerate(frames, start=1):
        col = (index - 1) % args.cols
        row = (index - 1) // args.cols
        x = col * args.cell_size
        y = row * args.cell_size
        draw.rectangle([x, y, x + args.cell_size - 1, y + args.cell_size - 1], outline="#cccccc")
        with Image.open(frame_path).convert("RGBA") as image:
            image.thumbnail((args.image_size, args.image_size), Image.Resampling.LANCZOS)
            px = x + (args.cell_size - image.width) // 2
            py = y + 16 + (args.image_size - image.height) // 2
            sheet.paste(Image.new("RGB", image.size, "#ffffff"), (px, py))
            sheet.paste(image.convert("RGB"), (px, py), image)
        label = str(index)
        draw.rectangle([x + 3, y + 3, x + 38, y + 16], fill="#1f6fa9")
        draw.text((x + 6, y + 5), label, fill="#ffffff", font=font)

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)
    print(f"Wrote contact sheet: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
