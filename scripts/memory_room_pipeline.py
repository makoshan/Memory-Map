#!/usr/bin/env python3
"""Build a reusable Memory Room interior asset pack from generated images.

The creative image generation step happens outside this script. Feed the script:
1. a baked memory-room background image
2. a #FF00FF sprite atlas with six separated interactive props

It writes transparent object sprites, manifests, interaction metadata, prompt files,
and a composed preview for React/Godot integration.
"""

from __future__ import annotations

import argparse
import filecmp
import json
import shutil
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont


@dataclass(frozen=True)
class MemoryRoomObject:
    key: str
    label: str
    material_type: str
    role: str
    primary_action: str
    secondary_action: str
    prompt_hint: str
    center_x: float
    center_y: float
    width_ratio: float
    z_index: int


OBJECTS = [
    MemoryRoomObject(
        key="bookshelf",
        label="书架",
        material_type="book",
        role="书",
        primary_action="open_book_library",
        secondary_action="打开书库",
        prompt_hint="Bookshelf / books",
        center_x=0.32,
        center_y=0.43,
        width_ratio=0.18,
        z_index=22,
    ),
    MemoryRoomObject(
        key="notes-desk",
        label="笔记台",
        material_type="note",
        role="笔记",
        primary_action="open_note_list",
        secondary_action="打开笔记列表",
        prompt_hint="Notes desk / notebooks and loose notes",
        center_x=0.28,
        center_y=0.70,
        width_ratio=0.17,
        z_index=42,
    ),
    MemoryRoomObject(
        key="map-wall",
        label="地图墙",
        material_type="location",
        role="地理位置",
        primary_action="open_location_graph",
        secondary_action="打开地点关联",
        prompt_hint="Map wall / geographic location",
        center_x=0.76,
        center_y=0.50,
        width_ratio=0.18,
        z_index=24,
    ),
    MemoryRoomObject(
        key="photo-album",
        label="相册",
        material_type="photo",
        role="照片",
        primary_action="open_photo_memories",
        secondary_action="打开照片列表",
        prompt_hint="Photo album / pictures",
        center_x=0.56,
        center_y=0.68,
        width_ratio=0.17,
        z_index=46,
    ),
    MemoryRoomObject(
        key="audio-machine",
        label="音频机",
        material_type="audio",
        role="音频",
        primary_action="play_audio_memory",
        secondary_action="播放语音",
        prompt_hint="Audio machine / voice recordings",
        center_x=0.80,
        center_y=0.71,
        width_ratio=0.14,
        z_index=48,
    ),
    MemoryRoomObject(
        key="timeline-table",
        label="时间台",
        material_type="timeline",
        role="回放",
        primary_action="replay_timeline",
        secondary_action="触发 AI 总结",
        prompt_hint="Timeline table / replay and AI summary",
        center_x=0.50,
        center_y=0.76,
        width_ratio=0.22,
        z_index=54,
    ),
]

GENERATED_ASSET_PREFIX = "/assets/generated/v2/"


def build_background_prompt() -> str:
    return """Use case: stylized-concept.
Asset type: baked raster base background for a 2D isometric memory room game scene.
Primary request: Generate a complex modern minimalist 记忆室 interior background for Memory Map, visually unified with the Hangzhou pixel-island style but calmer and more premium.
Layout: clean base room only; reserve six anchor zones for bookshelf/books, notes desk/notes, map wall/geographic location, photo album/photos, audio machine/audio, and timeline table/replay + AI summary.
Style: pale oak, white/cream walls, warm natural wood floor, glass railing, Hangzhou West Lake daylight view, indoor plants, thin brass details, muted teal-blue accent lights, soft shadows.
Constraints: background only; leave empty platforms/blank wall zones for interactive sprites; no UI overlay, purple numbered markers, labels, readable text, icons, character portraits, watermark, or object sheet layout."""


def build_atlas_prompt() -> str:
    object_lines = "\n".join(f"{index + 1}) {obj.prompt_hint}" for index, obj in enumerate(OBJECTS))
    return f"""Use case: stylized-concept.
Asset type: production sprite atlas for cutting transparent PNG props for a 2D isometric memory room game.
Primary request: Generate separated interactive memory-room objects matching the modern minimalist natural-oak 记忆室.
Canvas/layout: one wide atlas on a perfectly flat solid #FF00FF chroma-key background; generous padding; no overlap; no cropped edges.
Objects in exact left-to-right order:
{object_lines}
Style: pale oak furniture, clean white/cream surfaces, glass details, small teal-blue glow accents, premium mobile game isometric rendering.
Constraints: no labels, readable text, numbers, UI panels, purple markers, watermark, or #FF00FF inside objects."""


def copy_if_needed(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.resolve() == dst.resolve():
        return
    shutil.copy2(src, dst)


def generated_src(slug: str, filename: str) -> str:
    return f"{GENERATED_ASSET_PREFIX}{filename.format(slug=slug)}"


def local_path_for_generated_src(output_root: Path, src: str) -> Path:
    if not src.startswith(GENERATED_ASSET_PREFIX):
        raise ValueError(f"Expected generated asset src, got {src}")
    return output_root / src.removeprefix(GENERATED_ASSET_PREFIX)


def key_mask(image: Image.Image, threshold: float) -> tuple[np.ndarray, np.ndarray, list[int]]:
    rgb = np.array(image.convert("RGB"))
    rgb16 = rgb.astype(np.int16)
    border = np.concatenate(
        [rgb16[0, :, :], rgb16[-1, :, :], rgb16[:, 0, :], rgb16[:, -1, :]],
        axis=0,
    )
    key = np.median(border, axis=0)
    distance = np.linalg.norm(rgb16 - key, axis=2)
    return rgb, distance > threshold, key.round().astype(int).tolist()


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
            if area < min_area or box[2] - box[0] < 16 or box[3] - box[1] < 16:
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

    components.sort(key=lambda item: item["center"][0])
    return components, labels


def dilate_mask(mask: np.ndarray, passes: int) -> np.ndarray:
    result = mask.copy()
    for _ in range(max(0, passes)):
        expanded = result.copy()
        expanded[1:, :] |= result[:-1, :]
        expanded[:-1, :] |= result[1:, :]
        expanded[:, 1:] |= result[:, :-1]
        expanded[:, :-1] |= result[:, 1:]
        result = expanded
    return result


def chroma_spill_mask(rgb: np.ndarray, key: list[int]) -> np.ndarray:
    key_rgb = np.array(key, dtype=np.int16)
    if not (key_rgb[0] > 180 and key_rgb[1] < 100 and key_rgb[2] > 180):
        return np.zeros(rgb.shape[:2], dtype=bool)

    rgb16 = rgb.astype(np.int16)
    red = rgb16[:, :, 0]
    green = rgb16[:, :, 1]
    blue = rgb16[:, :, 2]
    low_green = green < np.minimum(red, blue) - 35
    purple_balance = np.abs(red - blue) < 110
    enough_chroma = (red > 60) & (blue > 60)
    near_key = np.linalg.norm(rgb16 - key_rgb, axis=2) < 280
    return low_green & purple_balance & enough_chroma & near_key


def crop_component(
    atlas: Image.Image,
    labels: np.ndarray,
    component: dict[str, Any],
    pad: int,
    key: list[int],
    spill_passes: int,
) -> Image.Image:
    width, height = atlas.size
    x0, y0, x1, y1 = component["box"]
    crop_box = (max(0, x0 - pad), max(0, y0 - pad), min(width, x1 + pad), min(height, y1 + pad))
    sprite = np.array(atlas.crop(crop_box))
    component_mask = labels[crop_box[1] : crop_box[3], crop_box[0] : crop_box[2]] == component["id"]

    if spill_passes > 0:
        edge_zone = dilate_mask(~component_mask, spill_passes) & component_mask
        spill = chroma_spill_mask(sprite[:, :, :3], key)
        component_mask = component_mask & ~(edge_zone & spill)

    sprite[~component_mask] = [0, 0, 0, 0]
    return Image.fromarray(sprite, "RGBA")


def write_contact_sheet(items: list[tuple[MemoryRoomObject, Image.Image, dict[str, Any]]], target: Path) -> None:
    cols = 3
    cell_w, cell_h = 280, 238
    label_h = 42
    rows = (len(items) + cols - 1) // cols
    preview = Image.new("RGBA", (cols * cell_w, rows * cell_h), (245, 247, 251, 255))
    draw = ImageDraw.Draw(preview)
    font = load_contact_sheet_font(15)
    small_font = load_contact_sheet_font(12)

    for index, (obj, sprite, entry) in enumerate(items):
        col = index % cols
        row = index // cols
        x = col * cell_w
        y = row * cell_h
        draw.rounded_rectangle(
            (x + 8, y + 8, x + cell_w - 8, y + cell_h - 8),
            radius=8,
            fill=(255, 255, 255, 255),
            outline=(215, 222, 232, 255),
            width=1,
        )
        max_w = cell_w - 28
        max_h = cell_h - label_h - 28
        scale = min(max_w / sprite.width, max_h / sprite.height, 1.0)
        thumb = sprite.resize(
            (max(1, int(sprite.width * scale)), max(1, int(sprite.height * scale))),
            Image.Resampling.NEAREST,
        )
        preview.alpha_composite(thumb, (x + (cell_w - thumb.width) // 2, y + 14 + (max_h - thumb.height) // 2))
        draw.text((x + 14, y + cell_h - label_h + 3), f"{index + 1:02d} {obj.label} · {obj.role}", fill=(18, 24, 38, 255), font=font)
        draw.text((x + 14, y + cell_h - 18), f"{obj.key} · {entry['width']}x{entry['height']}", fill=(82, 95, 116, 255), font=small_font)
    preview.convert("RGB").save(target, quality=95)


def load_contact_sheet_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for font_path in (
        Path("godot/assets/fonts/SourceHanSansCN-Regular.otf"),
        Path("/System/Library/Fonts/Hiragino Sans GB.ttc"),
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
    ):
        try:
            if font_path.exists():
                return ImageFont.truetype(str(font_path), size)
        except OSError:
            continue
    return ImageFont.load_default()


def place_sprite(background: Image.Image, sprite: Image.Image, obj: MemoryRoomObject) -> tuple[int, int, int, int]:
    target_w = int(background.width * obj.width_ratio)
    scale = target_w / sprite.width
    target_h = max(1, int(sprite.height * scale))
    resized = sprite.resize((max(1, target_w), target_h), Image.Resampling.LANCZOS)
    left = int(background.width * obj.center_x - resized.width / 2)
    top = int(background.height * obj.center_y - resized.height * 0.76)
    background.alpha_composite(resized, (left, top))
    return left, top, resized.width, resized.height


def build_pack(slug: str, output_root: Path, manifest: dict[str, Any], placements: dict[str, dict[str, int]]) -> dict[str, Any]:
    interactions = []
    for obj in OBJECTS:
        interactions.append(
            {
                "key": obj.key,
                "label": obj.label,
                "materialType": obj.material_type,
                "role": obj.role,
                "sprite": manifest["sprites"][obj.key]["src"],
                "placement": {
                    "centerX": obj.center_x,
                    "centerY": obj.center_y,
                    "widthRatio": obj.width_ratio,
                    "zIndex": obj.z_index,
                    "previewBox": placements.get(obj.key),
                },
                "actions": [
                    {
                        "type": obj.primary_action,
                        "label": obj.secondary_action,
                    }
                ],
            }
        )

    return {
        "slug": slug,
        "title": "记忆室",
        "theme": "Modern minimalist natural-oak memory room",
        "background": generated_src(slug, "{slug}-background.png"),
        "backgroundPrompt": generated_src(slug, "{slug}-background.prompt.txt"),
        "atlas": generated_src(slug, "{slug}-atlas.png"),
        "rawAtlas": generated_src(slug, "{slug}-atlas-raw.png"),
        "spritesManifest": generated_src(slug, "{slug}-sprites/manifest.json"),
        "spritesPreview": generated_src(slug, "{slug}-sprites-preview.png"),
        "scenePreview": generated_src(slug, "{slug}-scene-preview.png"),
        "map": generated_src(slug, "{slug}-map.json"),
        "toolFlow": generated_src(slug, "{slug}-tool-flow.json"),
        "interactions": interactions,
        "spriteCount": manifest["spriteCount"],
    }


def build_map_payload(
    slug: str,
    background: Image.Image,
    pack: dict[str, Any],
    manifest: dict[str, Any],
    placements: dict[str, dict[str, int]],
) -> dict[str, Any]:
    interactions_by_key = {interaction["key"]: interaction for interaction in pack["interactions"]}
    layers: list[dict[str, Any]] = [
        {
            "key": "background",
            "type": "base",
            "src": pack["background"],
            "zIndex": 0,
            "locked": True,
        }
    ]

    for obj in sorted(OBJECTS, key=lambda item: item.z_index):
        box = placements[obj.key]
        layers.append(
            {
                "key": obj.key,
                "type": "interactive_prop",
                "label": obj.label,
                "materialType": obj.material_type,
                "role": obj.role,
                "src": manifest["sprites"][obj.key]["src"],
                "zIndex": obj.z_index,
                "anchor": "bottom-center",
                "placement": {
                    "centerX": obj.center_x,
                    "centerY": obj.center_y,
                    "widthRatio": obj.width_ratio,
                    "box": box,
                },
                "hitArea": {
                    "shape": "rect",
                    "left": box["left"],
                    "top": box["top"],
                    "width": box["width"],
                    "height": box["height"],
                },
                "actions": interactions_by_key[obj.key]["actions"],
            }
        )

    return {
        "slug": slug,
        "title": "记忆室组合地图",
        "visualModel": "layered_raster",
        "runtimeObjectModel": "interactive_entities",
        "collisionModel": "trigger_zones",
        "engineTargets": ["React", "Godot"],
        "size": {"width": background.width, "height": background.height},
        "base": {"src": pack["background"]},
        "layers": layers,
        "interactions": pack["interactions"],
        "preview": pack["scenePreview"],
        "spritesManifest": pack["spritesManifest"],
        "toolFlow": pack["toolFlow"],
    }


def build_tool_flow_payload(
    slug: str,
    args: argparse.Namespace,
    pack: dict[str, Any],
    room_map: dict[str, Any],
) -> dict[str, Any]:
    return {
        "slug": slug,
        "name": "memory-room-layered-map-tool-flow",
        "entrypoint": "scripts/pixel_island_pipeline.py --memory-room",
        "command": [
            "python3",
            "scripts/pixel_island_pipeline.py",
            "--memory-room",
            "--slug",
            slug,
            "--raw-background",
            "<background.png>",
            "--raw-atlas",
            "<objects-atlas.png>",
            "--output-root",
            str(args.output_root),
            "--mirror-root",
            str(args.mirror_root) if args.mirror_root else "<optional-godot-root>",
            "--validate",
        ],
        "inputs": {
            "rawBackground": str(args.raw_background),
            "rawAtlas": str(args.raw_atlas),
            "expectedObjectOrder": [obj.key for obj in OBJECTS],
        },
        "outputs": {
            "background": pack["background"],
            "atlas": pack["atlas"],
            "spritesManifest": pack["spritesManifest"],
            "spritesPreview": pack["spritesPreview"],
            "scenePreview": pack["scenePreview"],
            "pack": generated_src(slug, "{slug}-pack.json"),
            "interactions": generated_src(slug, "{slug}-interactions.json"),
            "map": generated_src(slug, "{slug}-map.json"),
            "toolFlow": generated_src(slug, "{slug}-tool-flow.json"),
        },
        "map": generated_src(slug, "{slug}-map.json"),
        "steps": [
            {"id": "ingest-raw-assets", "label": "导入背景和 atlas 原图"},
            {"id": "key-atlas", "label": "从 #FF00FF atlas 建立透明层"},
            {"id": "cut-interactive-props", "label": "按连通区域切出 6 个可交互物件"},
            {"id": "despill-prop-edges", "label": "清理 magenta 残边并归零透明 RGB"},
            {"id": "compose-layered-map", "label": "把底图与物件按 zIndex 组合成地图预览"},
            {"id": "emit-runtime-contracts", "label": "输出 pack / interactions / map / manifest"},
            {"id": "mirror-godot-assets", "label": "镜像同名产物到 Godot 目录"},
            {"id": "validate-output-contract", "label": "验证 JSON、sprite 透明度、热区和镜像一致性"},
        ],
        "contracts": {
            "visualModel": room_map["visualModel"],
            "runtimeObjectModel": room_map["runtimeObjectModel"],
            "collisionModel": room_map["collisionModel"],
            "spriteCount": len(OBJECTS),
            "actions": [
                {"key": obj.key, "type": obj.primary_action, "label": obj.secondary_action}
                for obj in OBJECTS
            ],
        },
    }


def validate_outputs(slug: str, output_root: Path, mirror_root: Path | None) -> None:
    json_names = [
        f"{slug}-pack.json",
        f"{slug}-interactions.json",
        f"{slug}-map.json",
        f"{slug}-tool-flow.json",
        f"{slug}-sprites/manifest.json",
    ]
    payloads = {}
    for name in json_names:
        target = output_root / name
        if not target.exists():
            raise SystemExit(f"Missing expected output: {target}")
        payloads[name] = json.loads(target.read_text("utf-8"))

    manifest = payloads[f"{slug}-sprites/manifest.json"]
    pack = payloads[f"{slug}-pack.json"]
    room_map = payloads[f"{slug}-map.json"]
    interactions = payloads[f"{slug}-interactions.json"]

    if manifest["spriteCount"] != len(OBJECTS):
        raise SystemExit(f"Expected {len(OBJECTS)} sprites, got {manifest['spriteCount']}")
    if len(pack["interactions"]) != len(OBJECTS):
        raise SystemExit(f"Expected {len(OBJECTS)} interactions, got {len(pack['interactions'])}")
    if len(room_map["layers"]) != len(OBJECTS) + 1:
        raise SystemExit(f"Expected {len(OBJECTS) + 1} map layers, got {len(room_map['layers'])}")
    if [item["key"] for item in interactions["objects"]] != [obj.key for obj in OBJECTS]:
        raise SystemExit("Interaction object order does not match the memory-room object contract")

    for layer in room_map["layers"][1:]:
        hit_area = layer.get("hitArea", {})
        if hit_area.get("shape") != "rect" or hit_area.get("width", 0) <= 0 or hit_area.get("height", 0) <= 0:
            raise SystemExit(f"Invalid hit area for {layer.get('key')}")

    for key, entry in manifest["sprites"].items():
        sprite_path = local_path_for_generated_src(output_root, entry["src"])
        if not sprite_path.exists():
            raise SystemExit(f"Missing sprite: {sprite_path}")
        image = Image.open(sprite_path).convert("RGBA")
        alpha = image.getchannel("A")
        if alpha.getextrema() != (0, 255):
            raise SystemExit(f"Sprite alpha is not cut out cleanly: {key}")
        width, height = image.size
        border = []
        border.extend(alpha.crop((0, 0, width, 1)).getdata())
        border.extend(alpha.crop((0, height - 1, width, height)).getdata())
        border.extend(alpha.crop((0, 0, 1, height)).getdata())
        border.extend(alpha.crop((width - 1, 0, width, height)).getdata())
        if max(border) != 0:
            raise SystemExit(f"Sprite touches crop edge: {key}")
        hidden_magenta = sum(1 for red, green, blue, alpha_value in image.getdata() if alpha_value == 0 and red > 180 and blue > 180 and green < 100)
        if hidden_magenta:
            raise SystemExit(f"Sprite has hidden magenta RGB in transparent pixels: {key}")

    if mirror_root:
        for name in json_names:
            source = output_root / name
            mirrored = mirror_root / name
            if not mirrored.exists():
                raise SystemExit(f"Missing mirrored output: {mirrored}")
            if not filecmp.cmp(source, mirrored, shallow=False):
                raise SystemExit(f"Mirrored JSON differs: {name}")


def mirror_pack(slug: str, output_root: Path, mirror_root: Path) -> None:
    mirror_root.mkdir(parents=True, exist_ok=True)
    for name in [
        f"{slug}-background.png",
        f"{slug}-background.prompt.txt",
        f"{slug}-atlas-raw.png",
        f"{slug}-atlas.png",
        f"{slug}-sprites-preview.png",
        f"{slug}-scene-preview.png",
        f"{slug}-pack.json",
        f"{slug}-interactions.json",
        f"{slug}-map.json",
        f"{slug}-tool-flow.json",
    ]:
        copy_if_needed(output_root / name, mirror_root / name)

    src_sprites = output_root / f"{slug}-sprites"
    dst_sprites = mirror_root / f"{slug}-sprites"
    if dst_sprites.exists():
        shutil.rmtree(dst_sprites)
    shutil.copytree(src_sprites, dst_sprites)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a Memory Room interior asset pack from generated images.")
    parser.add_argument("--slug", default="memory-room")
    parser.add_argument("--raw-background", type=Path, required=True)
    parser.add_argument("--raw-atlas", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, default=Path("public/assets/generated/v2"))
    parser.add_argument("--mirror-root", type=Path)
    parser.add_argument("--key-threshold", type=float, default=90.0)
    parser.add_argument("--min-area", type=int, default=250)
    parser.add_argument("--component-padding", type=int, default=8)
    parser.add_argument("--spill-cleanup-passes", type=int, default=18)
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()

    output_root = args.output_root
    slug = args.slug
    sprites_dir = output_root / f"{slug}-sprites"
    output_root.mkdir(parents=True, exist_ok=True)

    copy_if_needed(args.raw_background, output_root / f"{slug}-background.png")
    copy_if_needed(args.raw_atlas, output_root / f"{slug}-atlas-raw.png")
    (output_root / f"{slug}-background.prompt.txt").write_text(build_background_prompt() + "\n", "utf-8")

    raw_atlas = Image.open(args.raw_atlas).convert("RGB")
    rgb, mask, key = key_mask(raw_atlas, args.key_threshold)
    atlas_rgba = np.dstack([rgb, (mask.astype(np.uint8) * 255)])
    atlas_rgba[~mask] = [0, 0, 0, 0]
    transparent_atlas = Image.fromarray(atlas_rgba, "RGBA")
    transparent_atlas.save(output_root / f"{slug}-atlas.png")

    components, labels = extract_components(mask, args.min_area)
    if len(components) != len(OBJECTS):
        raise SystemExit(f"Expected {len(OBJECTS)} objects, found {len(components)}. Try --key-threshold or --min-area.")

    if sprites_dir.exists():
        shutil.rmtree(sprites_dir)
    sprites_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, Any] = {
        "version": f"{slug}-v1",
        "generator": "scripts/memory_room_pipeline.py",
        "sourceRaw": f"/assets/generated/v2/{slug}-atlas-raw.png",
        "sourceTransparent": f"/assets/generated/v2/{slug}-atlas.png",
        "preview": f"/assets/generated/v2/{slug}-sprites-preview.png",
        "backgroundKey": f"border median RGB {key}, removed by key-distance threshold {args.key_threshold}",
        "spriteCount": len(OBJECTS),
        "sprites": {},
    }

    items: list[tuple[MemoryRoomObject, Image.Image, dict[str, Any]]] = []
    for obj, component in zip(OBJECTS, components, strict=True):
        sprite = crop_component(transparent_atlas, labels, component, args.component_padding, key, args.spill_cleanup_passes)
        sprite.save(sprites_dir / f"{obj.key}.png")
        x0, y0, x1, y1 = component["box"]
        crop_box = [
            max(0, x0 - args.component_padding),
            max(0, y0 - args.component_padding),
            min(transparent_atlas.width, x1 + args.component_padding),
            min(transparent_atlas.height, y1 + args.component_padding),
        ]
        entry = {
            "src": f"/assets/generated/v2/{slug}-sprites/{obj.key}.png",
            "label": obj.label,
            "materialType": obj.material_type,
            "role": obj.role,
            "sourceBox": [int(value) for value in component["box"]],
            "cropBox": [int(value) for value in crop_box],
            "width": sprite.width,
            "height": sprite.height,
            "area": int(component["area"]),
            "anchor": "bottom-center",
        }
        manifest["sprites"][obj.key] = entry
        items.append((obj, sprite, entry))

    (sprites_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")
    (sprites_dir / "prompt-used.txt").write_text(build_atlas_prompt() + "\n", "utf-8")
    write_contact_sheet(items, output_root / f"{slug}-sprites-preview.png")

    background = Image.open(output_root / f"{slug}-background.png").convert("RGBA")
    placements: dict[str, dict[str, int]] = {}
    for obj, sprite, _entry in sorted(items, key=lambda item: item[0].z_index):
        left, top, width, height = place_sprite(background, sprite, obj)
        placements[obj.key] = {"left": left, "top": top, "width": width, "height": height}
    background.convert("RGB").save(output_root / f"{slug}-scene-preview.png", quality=95)

    pack = build_pack(slug, output_root, manifest, placements)
    room_map = build_map_payload(slug, background, pack, manifest, placements)
    tool_flow = build_tool_flow_payload(slug, args, pack, room_map)
    (output_root / f"{slug}-pack.json").write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", "utf-8")
    (output_root / f"{slug}-interactions.json").write_text(
        json.dumps({"slug": slug, "objects": pack["interactions"]}, ensure_ascii=False, indent=2) + "\n",
        "utf-8",
    )
    (output_root / f"{slug}-map.json").write_text(json.dumps(room_map, ensure_ascii=False, indent=2) + "\n", "utf-8")
    (output_root / f"{slug}-tool-flow.json").write_text(json.dumps(tool_flow, ensure_ascii=False, indent=2) + "\n", "utf-8")

    if args.mirror_root:
        mirror_pack(slug, output_root, args.mirror_root)

    if args.validate:
        validate_outputs(slug, output_root, args.mirror_root)

    print(
        json.dumps(
            {
                "slug": slug,
                "spriteCount": manifest["spriteCount"],
                "sprites": str(sprites_dir),
                "pack": str(output_root / f"{slug}-pack.json"),
                "interactions": str(output_root / f"{slug}-interactions.json"),
                "map": str(output_root / f"{slug}-map.json"),
                "toolFlow": str(output_root / f"{slug}-tool-flow.json"),
                "preview": str(output_root / f"{slug}-scene-preview.png"),
                "validated": bool(args.validate),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
