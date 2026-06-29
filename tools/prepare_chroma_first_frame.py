#!/usr/bin/env python3
"""Composite a transparent sprite PNG onto a flat chroma background for image2video."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def parse_hex_color(value: str) -> tuple[int, int, int]:
    raw = value.strip().lstrip("#")
    if len(raw) != 6:
        raise ValueError(f"Expected 6-digit hex color, got {value}")
    return int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)


def normalize_hex_color(value: str) -> str:
    r, g, b = parse_hex_color(value)
    return f"#{r:02X}{g:02X}{b:02X}"


def parse_canvas_size(value: str) -> tuple[int, int]:
    normalized = value.lower().replace(",", "x")
    parts = [part.strip() for part in normalized.split("x") if part.strip()]
    if len(parts) != 2:
        raise ValueError(f"Canvas size must look like WIDTHxHEIGHT, got {value}")
    width, height = int(parts[0]), int(parts[1])
    if width <= 0 or height <= 0:
        raise ValueError("Canvas width and height must be positive")
    return width, height


def expand_box(box: tuple[int, int, int, int], padding: int, size: tuple[int, int]) -> tuple[int, int, int, int]:
    width, height = size
    left, top, right, bottom = box
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )


def resample_filter(name: str) -> Image.Resampling:
    if name == "nearest":
        return Image.Resampling.NEAREST
    if name == "bicubic":
        return Image.Resampling.BICUBIC
    if name == "lanczos":
        return Image.Resampling.LANCZOS
    raise ValueError(f"Unsupported resample mode: {name}")


def fit_image(image: Image.Image, canvas_size: tuple[int, int], resample: Image.Resampling) -> tuple[Image.Image, tuple[int, int], float]:
    canvas_w, canvas_h = canvas_size
    scale = min(canvas_w / image.width, canvas_h / image.height)
    scaled_size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    resized = image.resize(scaled_size, resample)
    paste_location = ((canvas_w - scaled_size[0]) // 2, (canvas_h - scaled_size[1]) // 2)
    return resized, paste_location, scale


def prepare_chroma_first_frame(
    source: Path | str,
    output: Path | str,
    *,
    background_color: str = "#00FF00",
    canvas_size: tuple[int, int] | None = None,
    layout_mode: str = "preserve-canvas",
    padding: int = 0,
    resample: str = "nearest",
) -> dict:
    source_path = Path(source)
    output_path = Path(output)
    if layout_mode not in {"preserve-canvas", "fit-foreground"}:
        raise ValueError(f"Unsupported layout mode: {layout_mode}")
    if padding < 0:
        raise ValueError("Padding must be zero or greater")

    with Image.open(source_path) as opened:
        source_image = opened.convert("RGBA")

    source_size = source_image.size
    target_size = canvas_size or source_size
    alpha_box = source_image.getchannel("A").getbbox()
    foreground_box = None
    working = source_image

    if layout_mode == "fit-foreground":
        if alpha_box is None:
            working = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
            foreground_box = None
        else:
            foreground_box = expand_box(alpha_box, padding, source_size)
            working = source_image.crop(foreground_box)

    resized, paste_location, scale = fit_image(working, target_size, resample_filter(resample))
    background = Image.new("RGB", target_size, parse_hex_color(background_color))
    background.paste(resized.convert("RGB"), paste_location, resized.getchannel("A"))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    background.save(output_path)

    return {
        "source": str(source_path),
        "output": str(output_path),
        "background_color": normalize_hex_color(background_color),
        "layout_mode": layout_mode,
        "source_size": list(source_size),
        "output_size": list(target_size),
        "source_alpha_bbox": list(alpha_box) if alpha_box else None,
        "foreground_bbox": list(foreground_box) if foreground_box else None,
        "scale": scale,
        "scaled_size": list(resized.size),
        "paste_location": list(paste_location),
        "resample": resample,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Transparent PNG source asset")
    parser.add_argument("--output", required=True, help="Green-screen first-frame PNG for image2video")
    parser.add_argument("--background-color", default="#00FF00")
    parser.add_argument("--canvas-size", help="Optional WIDTHxHEIGHT output canvas, for example 1024x1024")
    parser.add_argument("--layout-mode", choices=["preserve-canvas", "fit-foreground"], default="preserve-canvas")
    parser.add_argument("--padding", type=int, default=0, help="Extra transparent pixels around alpha bbox in fit-foreground mode")
    parser.add_argument("--resample", choices=["nearest", "bicubic", "lanczos"], default="nearest")
    parser.add_argument("--report", help="Optional JSON report path")
    args = parser.parse_args()

    report = prepare_chroma_first_frame(
        args.input,
        args.output,
        background_color=args.background_color,
        canvas_size=parse_canvas_size(args.canvas_size) if args.canvas_size else None,
        layout_mode=args.layout_mode,
        padding=args.padding,
        resample=args.resample,
    )
    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote chroma first frame: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
