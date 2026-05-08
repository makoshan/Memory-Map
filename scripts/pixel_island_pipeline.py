#!/usr/bin/env python3
"""Postprocess a generated pixel-island background and sprite atlas into a reusable pack.

The creative image generation step happens outside this script. Feed the script:
1. a baked background image
2. a sprite atlas generated on a near-#FF00FF chroma-key background

It writes transparent sprites, manifests, prompt files, and a composite preview that
can be consumed by the React homepage or a future Godot export.
"""

from __future__ import annotations

import argparse
import json
import shutil
from collections import deque
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont


SPRITE_ROWS = [
    {
        "role": "main-building",
        "names": [
            "home-island",
            "office-tower-island",
            "memory-museum-island",
            "finance-tower-island",
            "life-sports-island",
            "ai-lab-island",
        ],
    },
    {
        "role": "landmark-or-bridge",
        "names": [
            "pagoda-island",
            "lighthouse-island",
            "wood-pier-large",
            "stone-arch-bridge",
            "scenic-stone-bridge",
            "wood-footbridge",
            "wood-dock",
        ],
    },
    {
        "role": "boat",
        "names": ["ferry-boat", "sailboat", "rowboat", "tour-boat", "white-yacht"],
    },
    {
        "role": "nature-or-tile",
        "names": [
            "tree-broadleaf",
            "tree-pine",
            "tree-cherry",
            "bamboo-patch",
            "reed-patch",
            "flower-bed",
            "tree-palm",
            "grass-island-tile",
            "cliff-island-tile",
            "lake-island-tile",
        ],
    },
    {
        "role": "prop-or-character",
        "names": [
            "bench",
            "streetlamp",
            "signpost",
            "avatar-male",
            "avatar-female",
            "avatar-researcher",
            "ai-robot",
        ],
    },
]

LAYER_PLAN = [
    {
        "key": "office",
        "kind": "spot",
        "spriteKey": "office-tower-island",
        "label": "Office",
        "level": "Lv.8",
        "view": "office",
        "position": {"left": "6.5%", "top": "32%", "width": "20%", "height": "31%", "zIndex": 24},
    },
    {
        "key": "memory",
        "kind": "spot",
        "spriteKey": "memory-museum-island",
        "label": "Memory",
        "level": "Lv.7",
        "view": "memory",
        "position": {"left": "39%", "top": "28%", "width": "20%", "height": "29%", "zIndex": 26},
    },
    {
        "key": "finance",
        "kind": "spot",
        "spriteKey": "finance-tower-island",
        "label": "Finance",
        "level": "Lv.6",
        "position": {"left": "70%", "top": "34%", "width": "19%", "height": "31%", "zIndex": 25},
    },
    {
        "key": "life",
        "kind": "spot",
        "spriteKey": "life-sports-island",
        "label": "Life",
        "level": "Lv.5",
        "position": {"left": "5%", "top": "57%", "width": "23%", "height": "28%", "zIndex": 28},
    },
    {
        "key": "home",
        "kind": "spot",
        "spriteKey": "home-island",
        "label": "Home",
        "level": "Lv.10",
        "position": {"left": "40%", "top": "55%", "width": "21%", "height": "32%", "zIndex": 34},
    },
    {
        "key": "ai",
        "kind": "spot",
        "spriteKey": "ai-lab-island",
        "label": "AI Lab",
        "level": "Lv.7",
        "position": {"left": "73%", "top": "61%", "width": "19%", "height": "27%", "zIndex": 32},
    },
    {
        "key": "bridge-home-ai",
        "kind": "prop",
        "spriteKey": "wood-footbridge",
        "position": {
            "left": "61%",
            "top": "66%",
            "width": "12%",
            "height": "10%",
            "rotate": "8deg",
            "zIndex": 29,
        },
    },
    {
        "key": "bridge-home-life",
        "kind": "prop",
        "spriteKey": "stone-arch-bridge",
        "position": {
            "left": "28%",
            "top": "63%",
            "width": "15%",
            "height": "12%",
            "rotate": "-4deg",
            "zIndex": 27,
        },
    },
    {
        "key": "lighthouse",
        "kind": "prop",
        "spriteKey": "lighthouse-island",
        "position": {"left": "64%", "top": "73%", "width": "12%", "height": "22%", "zIndex": 36},
    },
    {
        "key": "sailboat",
        "kind": "prop",
        "spriteKey": "sailboat",
        "position": {"left": "29%", "top": "81%", "width": "8%", "height": "10%", "zIndex": 38},
    },
    {
        "key": "tour-boat",
        "kind": "prop",
        "spriteKey": "tour-boat",
        "position": {"left": "91%", "top": "48%", "width": "7.5%", "height": "8%", "zIndex": 18},
    },
    {
        "key": "player",
        "kind": "character",
        "spriteKey": "avatar-male",
        "position": {"left": "50%", "top": "64%", "width": "4.2%", "height": "13%", "zIndex": 48},
    },
    {
        "key": "researcher",
        "kind": "character",
        "spriteKey": "avatar-researcher",
        "position": {"left": "17%", "top": "42%", "width": "4.1%", "height": "12.5%", "zIndex": 46},
    },
    {
        "key": "robot",
        "kind": "character",
        "spriteKey": "ai-robot",
        "position": {"left": "82%", "top": "65%", "width": "4.7%", "height": "13%", "zIndex": 47},
    },
]


def build_background_prompt(city: str, theme: str) -> str:
    return f"""Use case: stylized-concept.
Asset type: baked raster background map for a layered pixel-island world UI.
Primary request: Generate a {city} pixel-island background map for {theme}.
Scene: bright daytime city bay, blue water, distant skyline, soft hills, white clouds, landmark hill/pagoda silhouette, and empty isometric island pads for later sprite placement.
Strict exclusions: no UI overlay, no labels, no icons, no text, no numbers, no buttons, no character portraits, no large foreground building that blocks sprite overlays.
Quality: clean pixel-art-inspired game illustration, crisp for a 16:9 web app stage, with safe negative space at top-left and bottom-left."""


def build_sprites_prompt(city: str, theme: str) -> str:
    return f"""Use case: stylized-concept.
Asset type: production sprite atlas for a React/Godot pixel-island UI game.
Primary request: Generate a clean isometric pixel-art sprite sheet for a {city} personal island world for {theme}.
Canvas/layout requirements: wide atlas, perfectly flat solid #FF00FF chroma-key background, generous #FF00FF space between every object, no overlap, no cropped edges, no text.
Sprites requested: home island, office tower island, memory museum island, finance tower island, life/sports island, AI lab island, landmarks, bridges, boats, nature props, street props, avatars, and friendly AI robot.
Quality: each sprite must be visually distinct and cutout-ready for automated connected-component extraction."""


def copy_if_needed(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.resolve() == dst.resolve():
        return
    shutil.copy2(src, dst)


def make_foreground_mask(image: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    rgb = np.array(image.convert("RGB"))
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    bg = (r > 180) & (b > 180) & (g < 90) & (np.abs(r.astype(int) - b.astype(int)) < 80)
    return rgb, ~bg


def extract_components(mask: np.ndarray, min_area: int) -> tuple[list[dict[str, Any]], np.ndarray]:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    labels = np.zeros((height, width), dtype=np.int32)
    components: list[dict[str, Any]] = []
    next_id = 1

    for y in range(height):
        for x in range(width):
            if not mask[y, x] or visited[y, x]:
                continue
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited[y, x] = True
            points: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                cx, cy = queue.popleft()
                points.append((cx, cy))
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((nx, ny))

            area = len(points)
            box = (min_x, min_y, max_x + 1, max_y + 1)
            if area < min_area or box[2] - box[0] < 12 or box[3] - box[1] < 12:
                continue

            comp_id = next_id
            next_id += 1
            for px, py in points:
                labels[py, px] = comp_id
            components.append(
                {
                    "id": comp_id,
                    "box": box,
                    "area": area,
                    "center": ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2),
                }
            )

    components.sort(key=lambda item: (item["center"][1], item["center"][0]))
    return components, labels


def cluster_rows(components: list[dict[str, Any]], row_threshold: int) -> list[list[dict[str, Any]]]:
    rows: list[dict[str, Any]] = []
    for component in components:
        cy = component["center"][1]
        for row in rows:
            if abs(cy - row["avg"]) < row_threshold:
                row["items"].append(component)
                row["avg"] = sum(item["center"][1] for item in row["items"]) / len(row["items"])
                break
        else:
            rows.append({"avg": cy, "items": [component]})
    for row in rows:
        row["items"].sort(key=lambda item: item["center"][0])
    return [row["items"] for row in rows]


def crop_component(atlas: Image.Image, labels: np.ndarray, component: dict[str, Any], pad: int) -> Image.Image:
    width, height = atlas.size
    x0, y0, x1, y1 = component["box"]
    crop_box = (max(0, x0 - pad), max(0, y0 - pad), min(width, x1 + pad), min(height, y1 + pad))
    sprite = np.array(atlas.crop(crop_box))
    component_mask = labels[crop_box[1] : crop_box[3], crop_box[0] : crop_box[2]] == component["id"]
    sprite[~component_mask, 3] = 0
    return Image.fromarray(sprite, "RGBA")


def write_sprite_outputs(
    slug: str,
    raw_atlas: Path,
    output_root: Path,
    city: str,
    theme: str,
    min_area: int,
    pad: int,
    row_threshold: int,
) -> dict[str, Any]:
    atlas_raw_target = output_root / f"{slug}-atlas-raw.png"
    atlas_target = output_root / f"{slug}-atlas.png"
    sprites_dir = output_root / f"{slug}-sprites"
    preview_target = output_root / f"{slug}-sprites-preview.png"

    copy_if_needed(raw_atlas, atlas_raw_target)
    raw = Image.open(atlas_raw_target).convert("RGB")
    rgb, mask = make_foreground_mask(raw)
    rgba = np.dstack([rgb, (mask.astype(np.uint8) * 255)])
    atlas = Image.fromarray(rgba, "RGBA")
    atlas.save(atlas_target)

    components, labels = extract_components(mask, min_area)
    rows = cluster_rows(components, row_threshold)
    expected_counts = [len(row["names"]) for row in SPRITE_ROWS]
    actual_counts = [len(row) for row in rows]

    if sprites_dir.exists():
        shutil.rmtree(sprites_dir)
    sprites_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, Any] = {
        "version": f"{slug}-v1",
        "generator": "scripts/pixel_island_pipeline.py",
        "sourceRaw": f"/assets/generated/v2/{slug}-atlas-raw.png",
        "sourceTransparent": f"/assets/generated/v2/{slug}-atlas.png",
        "preview": f"/assets/generated/v2/{slug}-sprites-preview.png",
        "backgroundKey": "#FF00FF family, removed by RGB threshold",
        "spriteCount": 0,
        "rows": actual_counts,
        "sprites": {},
    }

    items: list[tuple[str, Image.Image, dict[str, Any]]] = []
    names_match = actual_counts == expected_counts
    for row_index, row in enumerate(rows):
        row_spec = SPRITE_ROWS[row_index] if row_index < len(SPRITE_ROWS) else {"role": "sprite", "names": []}
        for item_index, component in enumerate(row):
            names = row_spec["names"]
            name = names[item_index] if names_match and item_index < len(names) else f"{slug}-sprite-{len(items) + 1:02d}"
            sprite = crop_component(atlas, labels, component, pad)
            sprite_path = sprites_dir / f"{name}.png"
            sprite.save(sprite_path)
            x0, y0, x1, y1 = component["box"]
            crop_box = [
                max(0, x0 - pad),
                max(0, y0 - pad),
                min(atlas.width, x1 + pad),
                min(atlas.height, y1 + pad),
            ]
            entry = {
                "src": f"/assets/generated/v2/{slug}-sprites/{name}.png",
                "role": row_spec["role"],
                "sourceBox": [int(value) for value in component["box"]],
                "cropBox": [int(value) for value in crop_box],
                "width": sprite.width,
                "height": sprite.height,
                "area": int(component["area"]),
                "anchor": "bottom-center",
            }
            manifest["sprites"][name] = entry
            items.append((name, sprite, entry))

    manifest["spriteCount"] = len(items)
    (sprites_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")
    (sprites_dir / "prompt-used.txt").write_text(build_sprites_prompt(city, theme) + "\n", "utf-8")
    write_contact_sheet(items, preview_target)
    return manifest


def write_contact_sheet(items: list[tuple[str, Image.Image, dict[str, Any]]], target: Path) -> None:
    cols = 7
    cell_w, cell_h = 220, 190
    label_h = 30
    rows = (len(items) + cols - 1) // cols
    preview = Image.new("RGBA", (cols * cell_w, rows * cell_h), (245, 247, 251, 255))
    draw = ImageDraw.Draw(preview)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
        small_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
    except OSError:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    for index, (name, sprite, entry) in enumerate(items):
        col = index % cols
        row = index // cols
        x = col * cell_w
        y = row * cell_h
        draw.rectangle((x + 6, y + 6, x + cell_w - 6, y + cell_h - 6), fill=(255, 255, 255, 255), outline=(215, 222, 232, 255), width=1)
        max_w = cell_w - 24
        max_h = cell_h - label_h - 26
        scale = min(max_w / sprite.width, max_h / sprite.height, 1.0)
        thumb = sprite.resize((max(1, int(sprite.width * scale)), max(1, int(sprite.height * scale))), Image.Resampling.NEAREST)
        preview.alpha_composite(thumb, (x + (cell_w - thumb.width) // 2, y + 12 + (max_h - thumb.height) // 2))
        label = f"{index + 1:02d} {name}"
        draw.text((x + 12, y + cell_h - label_h + 2), label[:27], fill=(18, 24, 38, 255), font=font)
        draw.text((x + 12, y + cell_h - 14), f"{entry['width']}x{entry['height']}", fill=(82, 95, 116, 255), font=small_font)
    preview.convert("RGB").save(target, quality=95)


def parse_percent(value: str, total: int) -> int:
    if value.endswith("%"):
        return int(round(float(value[:-1]) * total / 100))
    return int(round(float(value)))


def compose_preview(slug: str, output_root: Path) -> Path:
    background = Image.open(output_root / f"{slug}-background.png").convert("RGBA")
    layers = sorted(LAYER_PLAN, key=lambda layer: int(layer["position"].get("zIndex", 0)))
    canvas = background.copy()

    for layer in layers:
        sprite_path = output_root / f"{slug}-sprites" / f"{layer['spriteKey']}.png"
        if not sprite_path.exists():
            continue
        sprite = Image.open(sprite_path).convert("RGBA")
        position = layer["position"]
        target_w = parse_percent(position["width"], canvas.width)
        target_h = parse_percent(position["height"], canvas.height)
        fitted_scale = min(target_w / sprite.width, target_h / sprite.height)
        fitted = sprite.resize((max(1, int(sprite.width * fitted_scale)), max(1, int(sprite.height * fitted_scale))), Image.Resampling.LANCZOS)
        left = parse_percent(position["left"], canvas.width)
        top = parse_percent(position["top"], canvas.height)
        if "rotate" in position:
            fitted = fitted.rotate(-float(position["rotate"].replace("deg", "")), expand=True, resample=Image.Resampling.BICUBIC)
        canvas.alpha_composite(fitted, (left, top))

    target = output_root / f"{slug}-island-composite-preview.png"
    canvas.convert("RGB").save(target, quality=95)
    return target


def write_pack_json(slug: str, output_root: Path, city: str, theme: str, manifest: dict[str, Any]) -> None:
    layers = []
    for layer in LAYER_PLAN:
        layer_copy = dict(layer)
        sprite_key = layer_copy.pop("spriteKey")
        layer_copy["sprite"] = f"/assets/generated/v2/{slug}-sprites/{sprite_key}.png"
        layers.append(layer_copy)

    payload = {
        "slug": slug,
        "city": city,
        "theme": theme,
        "background": f"/assets/generated/v2/{slug}-background.png",
        "backgroundPrompt": f"/assets/generated/v2/{slug}-background.prompt.txt",
        "sceneImage": f"/assets/generated/v2/{slug}-island-composite-preview.png",
        "atlas": f"/assets/generated/v2/{slug}-atlas.png",
        "spritesManifest": f"/assets/generated/v2/{slug}-sprites/manifest.json",
        "spriteCount": manifest["spriteCount"],
        "compositePreview": f"/assets/generated/v2/{slug}-island-composite-preview.png",
        "layers": layers,
    }
    (output_root / f"{slug}-pack.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", "utf-8")


def mirror_pack(slug: str, output_root: Path, mirror_root: Path) -> None:
    mirror_root.mkdir(parents=True, exist_ok=True)
    for name in [
        f"{slug}-background.png",
        f"{slug}-background.prompt.txt",
        f"{slug}-atlas-raw.png",
        f"{slug}-atlas.png",
        f"{slug}-sprites-preview.png",
        f"{slug}-island-composite-preview.png",
        f"{slug}-pack.json",
    ]:
        copy_if_needed(output_root / name, mirror_root / name)

    src_sprites = output_root / f"{slug}-sprites"
    dst_sprites = mirror_root / f"{slug}-sprites"
    if dst_sprites.exists():
        shutil.rmtree(dst_sprites)
    shutil.copytree(src_sprites, dst_sprites)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a reusable pixel-island asset pack from generated images.")
    parser.add_argument("--slug", default="hangzhou")
    parser.add_argument("--city", default="Hangzhou")
    parser.add_argument("--theme", default="personal AI company")
    parser.add_argument("--raw-background", type=Path, required=True)
    parser.add_argument("--raw-atlas", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, default=Path("public/assets/generated/v2"))
    parser.add_argument("--mirror-root", type=Path)
    parser.add_argument("--min-area", type=int, default=100)
    parser.add_argument("--component-padding", type=int, default=8)
    parser.add_argument("--row-threshold", type=int, default=80)
    args = parser.parse_args()

    output_root = args.output_root
    output_root.mkdir(parents=True, exist_ok=True)
    copy_if_needed(args.raw_background, output_root / f"{args.slug}-background.png")
    (output_root / f"{args.slug}-background.prompt.txt").write_text(build_background_prompt(args.city, args.theme) + "\n", "utf-8")

    manifest = write_sprite_outputs(
        args.slug,
        args.raw_atlas,
        output_root,
        args.city,
        args.theme,
        args.min_area,
        args.component_padding,
        args.row_threshold,
    )
    compose_preview(args.slug, output_root)
    write_pack_json(args.slug, output_root, args.city, args.theme, manifest)

    if args.mirror_root:
        mirror_pack(args.slug, output_root, args.mirror_root)

    print(
        json.dumps(
            {
                "slug": args.slug,
                "spriteCount": manifest["spriteCount"],
                "rows": manifest["rows"],
                "pack": str(output_root / f"{args.slug}-pack.json"),
                "preview": str(output_root / f"{args.slug}-island-composite-preview.png"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
