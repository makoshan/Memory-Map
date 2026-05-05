#!/usr/bin/env python3
"""Build a JavaScript manifest for promoted sprite sheets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def parse_metadata(root: Path, path: Path) -> dict:
    rel = path.relative_to(root)
    parts = rel.parts
    character = parts[0] if len(parts) >= 1 else "unknown"
    animation = parts[1] if len(parts) >= 2 else path.stem
    return {"character": character, "animation": animation}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--folder", default="final_sprites")
    parser.add_argument("--output", default="sprite_gallery_manifest.js")
    parser.add_argument("--latest-limit", type=int, default=10)
    args = parser.parse_args()

    root = Path(args.folder)
    if not root.exists():
        raise SystemExit(f"Folder not found: {root}")

    entries = []
    for path in root.rglob("*.png"):
        if "frames" in path.parts:
            continue
        with Image.open(path) as image:
            width, height = image.size
        meta = parse_metadata(root, path)
        stat = path.stat()
        entries.append({
            "label": path.stem,
            "path": path.as_posix(),
            "folder": path.parent.as_posix(),
            "character": meta["character"],
            "animation": meta["animation"],
            "width": width,
            "height": height,
            "byteSize": stat.st_size,
            "modified": stat.st_mtime,
        })

    entries.sort(key=lambda item: item["modified"], reverse=True)
    output = Path(args.output)
    output.write_text(
        "window.SPRITE_LATEST_LIMIT = "
        + json.dumps(args.latest_limit)
        + ";\nwindow.SPRITE_SHEETS = "
        + json.dumps(entries, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(entries)} sheet entries to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
