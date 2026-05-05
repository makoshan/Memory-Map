# Sprite Pipeline for Memory Map

This project uses a local, license-safe implementation of the video-to-sprite workflow described by LayrKits/Sprite-Pipeline. The implementation is original to this repo and does not vendor the upstream code.

## Where It Fits

- Use it for Godot Layer 3 character animation: player walk, AI employee idle, NPC reactions, spell or unlock effects.
- Keep static buildings, rooms, icons, and islands in the existing generated atlas flow.
- Promote only reviewed outputs into `final_sprites/` or `godot/assets/sprites/`.

## Personalized Asset Generation Loop

The core product value is that every person gets a different character, map, unlock path, and world behavior. Layer 1 should generate a structured prompt, then the asset worker turns it into Godot-ready sprites.

```text
Layer 1 PlaceProfile / LifeStage / Semantic Tags
  -> prompts/<asset>.json
  -> Codex image2 first frame
  -> Dreamina CLI image-to-video or local source video
  -> tools/extract_frames_ffmpeg.py
  -> tools/make_contact_sheet.py
  -> tools/select_frames.py
  -> tools/animation_pipeline.py
  -> final_sprites/
  -> godot/assets/generated/
  -> godot/data/generated_assets_manifest.json
```

Use the orchestration script for the full loop:

```bash
python tools/personal_asset_pipeline.py \
  --prompt prompts/personal_asset.example.json
```

The intended production flow is:

1. Codex image2 generates the first frame as a local PNG with a flat `#00FF00` background.
2. The prompt JSON stores that path in `generation.first_frame_image`.
3. `tools/personal_asset_pipeline.py` calls `dreamina image2video`.
4. The script polls `dreamina query_result --submit_id=... --download_dir=...`.
5. The downloaded video is normalized into Godot-ready sprites.

Prompt templates live in `prompts/sprite_generation_templates.md`. They cover:

- Codex image2 first-frame generation;
- Dreamina walk-in-place animation;
- building unlock animation;
- damp-fatigue environmental state;
- recovery environmental state;
- rejection and review rules.

The MVP animation scope lives in `prompts/animation_jobs.mvp.json`. It intentionally generates walk animations only for actors, while buildings and environments receive unlock, upgrade, and semantic state animations.

For local testing without spending API credits, pass an already downloaded video:

```bash
python tools/personal_asset_pipeline.py \
  --prompt prompts/personal_asset.example.json \
  --source-video "source_videos/alex_walk.mp4"
```

The script writes:

- the working run under `work/runs/personal_assets/`;
- a raw contact sheet for review;
- the promoted transparent sprite strip under `final_sprites/`;
- a copy under `godot/assets/generated/` when `pipeline.copy_to_godot` is true;
- `godot/data/generated_assets_manifest.json` so Godot can discover generated personal assets.

Dreamina uses local OAuth login through the CLI, so no API key is stored in the prompt file. Run `dreamina login` once on the machine before launching generation jobs.

## Source Asset Rules

Use a first-frame image with a flat chroma background:

- Preferred key: `#00FF00`.
- One character only.
- Full body visible.
- Character centered with generous margins.
- No shadows, floor, gradients, props, text, watermark, or border.
- No green on the character if using the green key.

For non-idle animation, create a small transition pose before sending the image to the video model. Ask the video model for locked camera, same size, same facing, no travel, no zoom, and unchanged flat green background.

## Local Workflow

Extract frames:

```bash
python tools/extract_frames_ffmpeg.py \
  --input "source_videos/alex_walk.mp4" \
  --output-dir "work/runs/alex_walk/extracted/alex/walk" \
  --overwrite
```

Make a contact sheet:

```bash
python tools/make_contact_sheet.py \
  --source-dir "work/runs/alex_walk/extracted/alex/walk" \
  --output "work/runs/alex_walk/contact_sheets/alex_walk_raw_contact.png" \
  --cols 12 \
  --cell-size 128 \
  --image-size 112
```

Select the frames:

```bash
python tools/select_frames.py \
  --source-dir "work/runs/alex_walk/extracted/alex/walk" \
  --output-dir "work/runs/alex_walk/selected/alex/walk/12f" \
  --indices "1,6,11,17,22,27,32,38,43,49,54,60" \
  --frame-prefix "alex_walk_12f" \
  --notes "ready,left step,down,center,right step,down,center,left step,down,center,recover,loop"
```

Build the 256 strip:

```bash
python tools/animation_pipeline.py \
  --source-frames-dir "work/runs/alex_walk/selected/alex/walk/12f" \
  --frames 12 \
  --output "final_sprites/alex/walk/sheets/alex_walk_12f_256.png" \
  --preview "work/runs/alex_walk/previews/alex_walk_12f_256_preview.png" \
  --frames-dir "final_sprites/alex/walk/frames/12f_256" \
  --report "work/runs/alex_walk/reports/alex_walk_12f_256_report.json" \
  --background-mode chroma \
  --layout-mode preserve-canvas \
  --frame-prefix "alex_walk_12f"
```

Rebuild the viewer manifest:

```bash
python tools/build_sprite_gallery_manifest.py \
  --folder "final_sprites" \
  --output "sprite_gallery_manifest.js"
```

Open `sprite_viewer.html` to inspect promoted strips.

## Godot Import

For a horizontal `12 x 256` strip:

- Use `AnimatedSprite2D` or `SpriteFrames`.
- Cell size: `256 x 256`.
- Frame count: `sheet_width / 256`.
- Set the origin in Godot, not by rewriting pixels in the pipeline.

The pipeline's default `preserve-canvas` mode intentionally avoids per-frame recentering. That prevents animation jitter.
