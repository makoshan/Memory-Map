# Memory Map Layer 3

Godot 4.6 project for the personal game layer.

## Boundary

- Tauri / React / TypeScript owns the app shell, Mapbox, SQLite, local data, Hermes Agent, tasks, settings, and detail panels.
- Godot owns Layer 3 only: islands, buildings, rooms, player movement, unlocks, growth, weather, dampness, recovery, and atmosphere.
- The bridge is `godot/data/world_state.json`, generated from TypeScript with `npm run export:godot`.

## Run

```bash
/Applications/Godot.app/Contents/MacOS/Godot --path godot
```

Open `res://scenes/layer3_world.tscn`.

## Current Interaction Loop

- Click anywhere in the world to move the player.
- Click a building/island node to walk to it and open the room panel.
- Use room actions to view events, replay the timeline, ask AI advice, or complete today's task.
- Completing a task updates the task panel and plays a small reward burst.
- Godot reads generated character animation strips from `godot/data/generated_assets_manifest.json`.
- If a generated walk strip exists, the player uses `AnimatedSprite2D`; otherwise it falls back to the static player sprite.
- Left movement mirrors the right-facing walk animation, matching the MVP direction strategy.

## Verify

```bash
/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot --quit
/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot res://scenes/layer3_world.tscn --quit-after 1
```
