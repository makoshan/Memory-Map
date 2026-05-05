# Animation Asset Plan

Memory Map does not animate every asset. The animation budget should reinforce the product promise: each person gets a personal character and a personal world that grows from Layer 1.

## What Gets Character Animations

Character animations are only for actors:

- player avatar;
- AI employees;
- assistant characters;
- robots;
- important NPCs.

These are the assets that users read as alive. They can move through Godot Layer 3, enter rooms, and respond to tasks.

MVP actor animations:

- `idle`: default standing loop;
- `walk`: click-to-move loop;
- `interact`: tap, inspect, enter room, or use screen;
- `work`: AI employee typing, scanning, reading, or analyzing;
- `react`: short acknowledgement when clicked or assigned a task;
- `celebrate`: player reward moment after task completion or unlock.

Deferred action-game animations:

- `run`;
- `jump`;
- `attack`;
- `block`;
- `die`;
- `climb`;
- `swim`.

Memory Map is an exploration and semantic world game, not an action RPG, so these are out of MVP scope.

## Direction Strategy

MVP should not generate all four directions for every action.

- Generate `down` and `right`.
- Mirror `right` in Godot for `left`.
- Defer `up` until navigation or room layouts clearly need it.

This keeps the first batch affordable while still making the world feel alive.

## What Gets State Animations

Buildings and environments should not walk. They express semantic changes:

- `unlock`: first time a PlaceProfile becomes visible;
- `upgrade`: visit/media/finance/work weight crosses a threshold;
- `recovery-state`: brighter light, more plants, small blooms;
- `damp-fatigue-state`: higher water, reeds, light mist;
- `work-dense-active`: office screens and lights activate;
- `memory-rich-active`: albums, shelves, and lights expand;
- `finance-active`: charts, coins, and ledger screens activate.

## MVP Priority

P0:

- player `idle`, `walk`, `interact`, and `celebrate`;
- AI researcher, analyst, assistant, and bot `idle`, `walk`, `work`, and `react`;
- home, office, memory, and life/recovery `unlock` or state animations.

P1:

- alternate avatar `idle`, `walk`, and `interact`;
- finance tower;
- AI lab;
- island water/recovery/damp state.

P2:

- tree, flower, reed, lamp, signpost, boat, and bridge ambience.

UI icons, badges, cards, and panels stay static.

## Batch Job Source

The machine-readable MVP job list is:

```text
prompts/animation_jobs.mvp.json
```

Each job eventually becomes a `prompts/<asset>.json` file consumed by:

```bash
python3 tools/personal_asset_pipeline.py --prompt prompts/<asset>.json
```

The production path is:

```text
Layer 1 semantics
-> Codex image2 first frame
-> dreamina_cli image2video
-> local sprite pipeline
-> final_sprites
-> godot/data/generated_assets_manifest.json
```
