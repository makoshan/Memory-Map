# Production Local Data Design

## Goal

Move Memory Map from a sample-data prototype to a local-first production application where real user records, imports, semantic inference, Mapbox, Hermes, and Godot all use one persisted data pipeline.

## Scope

This design covers the first production slice:

- Tauri + SQLite as the authoritative local store.
- Manual Place, Trace, Event, Note, and Media records.
- CSV import for Place, Trace, Event, Note, and Media metadata.
- Image import with EXIF GPS extraction.
- Note location extraction with explicit inference provenance and confidence.
- Mapbox rendering from local SQLite data.
- Layer 1 semantic generation from persisted data.
- Layer 2 world state generation from Layer 1.
- Hermes gateway configuration, with local fallback when offline.
- Formal export of `godot/data/world_state.json` and `public/godot/world_state.json`.

Later slices will add GPX/GeoJSON import, richer EXIF batches, health device imports, advanced finance import, cloud sync, accounts, AR, and packaged Godot embedding.

## Core Principle

The app must never treat inferred location as the same kind of fact as GPS.

Image GPS is a hard fact when it comes from EXIF GPS fields. Notes can produce inferred locations, but every inferred coordinate or address must carry provenance, confidence, and review state. The UI can use inferred locations to help the user, but it must show that they are inferred and allow correction.

Memory Map should not stop at coordinates. The production pipeline must combine location evidence, time evidence, image meaning, note meaning, and user corrections into a single explainable semantic Event. The result should answer: what happened, where it happened, why it mattered, and how it should change the user's world.

## Location Evidence Model

Each location-bearing record should resolve into one or more `location_evidence` rows.

Evidence types:

- `gps_exif`: Coordinates from image EXIF. This is authoritative for that media file.
- `gps_trace`: Coordinates from imported or recorded trace points.
- `manual_place`: Coordinates manually entered or selected by the user.
- `note_explicit_place`: A note names a known place, such as "西溪湿地" or "办公室".
- `note_time_context`: A note has no explicit place, but surrounding timestamp context indicates likely city/place.
- `note_address_text`: A note contains address text that can be geocoded.

Confidence levels:

- `1.0`: EXIF GPS, trace GPS, or user-confirmed coordinates.
- `0.75-0.95`: Explicit place mention that matches a known local Place.
- `0.45-0.75`: Timestamp/city context, such as "the user was in Hangzhou that day".
- `0.2-0.45`: Weak textual inference without strong temporal support.

Review states:

- `confirmed`: User confirmed or hard GPS evidence.
- `suggested`: Good inference, usable for previews and review queues.
- `needs_review`: Weak or conflicting inference.
- `rejected`: User rejected this evidence.

## Data Model

Add or formalize these tables in SQLite:

- `places`: Real places with coordinates, POI type, admin fields, source, and updated time.
- `traces`: Timestamped GPS points.
- `events`: User activity records linked to place and time.
- `notes`: Local notes with timestamp, body, optional source file, and optional related event.
- `media_items`: Imported image/file metadata with file path, captured time, EXIF GPS, checksum, and related event.
- `location_evidence`: Evidence rows linking notes, media, traces, events, or places to location candidates.
- `place_profiles`: Computed Layer 1 profiles.
- `world_nodes`: Computed Layer 2 nodes.
- `game_unlocks`: Computed unlocks visible in Layer 3.
- `agent_context_snapshots`: Semantic context sent to Hermes.
- `ai_suggestions`: AI three-line output and local fallback results.
- `import_jobs`: Import run status, file path, counts, warnings, and created time.
- `import_errors`: Row-level import validation errors.

The existing schema already covers many of these, but it needs real CRUD commands, source metadata, and the new note/media/evidence/import tables.

## Import Flow

CSV import uses a Memory Map standard template first. The CSV may include rows with `type=place`, `type=trace`, `type=event`, `type=note`, or `type=media`.

Import stages:

1. Parse file locally in Tauri.
2. Validate required columns by row type.
3. Normalize timestamps, tags, numbers, and coordinates.
4. Upsert Places.
5. Insert Traces, Events, Notes, and Media metadata.
6. Create `location_evidence` from coordinates, place IDs, note text, and timestamp context.
7. Recompute PlaceProfiles, world_nodes, unlocks, agent context, and AI fallback.
8. Export formal Godot world state.
9. Return import summary and row-level warnings to the UI.

CSV import must be deterministic and safe to repeat. Place rows upsert by `id`; media rows deduplicate by checksum or absolute path; event rows use stable IDs when provided and generated IDs otherwise.

## Manual Record Flow

Manual entry should support:

- Place: name, coordinates, POI type, city, district.
- Trace: timestamp and coordinates.
- Event: place, time range, tags, steps, media count, amount, notes.
- Note: timestamp, text, optional related place/event.
- Media: file selection, captured time, optional related event.

When a manual record changes, the app recomputes the derived semantic state and exports Godot world state. Computed data should not be hand-edited directly.

## Image Flow

Image import should:

- Read EXIF captured time and GPS locally.
- Store media metadata and file path in SQLite.
- Create `gps_exif` location evidence when EXIF GPS exists.
- Link the media to the nearest event/place by timestamp and distance when possible.
- If no GPS exists, fall back to timestamp context only as `suggested` or `needs_review`.

The UI must show whether a media location came from EXIF GPS or inference. EXIF GPS should not be overwritten by inferred note context.

## Note Location Flow

Notes can create location evidence through:

- Explicit place names matched against existing Places.
- Address-like text stored as address evidence until a geocoding provider is configured.
- Timestamp context from nearby traces, events, media, or same-day city.

Example: if the user was in Hangzhou during a date range and writes a note without location, the note may get Hangzhou-level inferred evidence with moderate confidence. It should not get an exact coordinate unless there is a nearby trace, EXIF photo, confirmed place, or explicit known place mention.

The UI should provide a review queue for suggested note locations, letting the user confirm, change, or reject them.

## Meaning Extraction Flow

Each imported image, note, or manual record should contribute to an `EventMeaning` result. The result is not a raw model caption; it is a structured semantic interpretation used by PlaceProfile, AI suggestions, and Layer 3.

Inputs:

- Time: EXIF capture time, note timestamp, event time range, or import time.
- Location: confirmed GPS, confirmed manual place, explicit note place, or inferred context.
- Visual content: objects, scene type, activity, visible text, people count when available, and confidence.
- Note content: user-written description, named people/projects, intent, mood, topic, and confidence.
- Existing context: nearby Places, same-day traces, recent Events, and known user projects.

For the robot exhibition example, the desired semantic event could be:

```json
{
  "title": "杭州刘小龙展会看机器人",
  "activity": "exhibition_visit",
  "topics": ["robotics", "AI hardware", "design research"],
  "placeMeaning": "technology_exhibition",
  "source": {
    "location": "gps_exif",
    "visual": "image_scene_analysis",
    "note": "user_note"
  },
  "confidence": {
    "location": 1.0,
    "visual": 0.72,
    "note": 0.95,
    "overall": 0.88
  }
}
```

The app should preserve the individual evidence behind this event. A wrong visual interpretation should be correctable without changing the hard EXIF GPS. A corrected user note should raise the meaning confidence for future similar media from the same place and time.

Meaning outputs should update:

- Event tags, such as `work`, `travel`, `life`, `research`, or `memory`.
- PlaceProfile role and score.
- World node style and unlocked rooms.
- AI task suggestions.
- Searchable local memory.

## Mapbox

Mapbox reads only normalized local app state:

- Places as markers.
- Traces as line layers.
- Events/media/notes as popups or side panel details.
- Suggested inferred locations use a distinct visual treatment from confirmed locations.

The app reads `VITE_MAPBOX_TOKEN`. Missing or invalid token should not break the app; it should show a configuration warning and keep the non-map world usable.

## Hermes

Hermes reads only semantic summaries:

- Recent Event summaries.
- PlaceProfile changes.
- active risks.
- today tasks.
- Layer 3 changes.
- location confidence warnings when inference affects a recommendation.

Hermes gateway URL is configured through `VITE_HERMES_GATEWAY_URL`. If it is absent or unreachable, local AI fallback generates the three lines and marks the result as local.

## Godot

Godot remains a consumer of formal world state, not raw private data.

The app exports:

- `godot/data/world_state.json` for the Godot project.
- `public/godot/world_state.json` for web preview and debugging.

The JSON should include generated world nodes, visual parameters, unlocks, AI three lines, tasks, and enough display labels for Layer 3. It should not include raw note bodies, photo paths, health details, or finance details unless they are explicitly transformed into semantic summaries.

## UI

Production UI should add:

- Data source status: SQLite ready, Mapbox configured, Hermes online/offline, Godot export status.
- Manual record forms for Place, Event, Trace, Note, and Media.
- CSV import screen with preview, validation errors, and import summary.
- Location evidence review queue for inferred note/media locations.
- Mapbox view driven by persisted Places and Traces.
- World view driven by recomputed world nodes.
- AI three-line panel with source indicator: Hermes or local fallback.

## Error Handling

- Invalid CSV rows are skipped, logged in `import_errors`, and shown in the import summary.
- Invalid coordinates are rejected.
- Timestamps without timezone are interpreted in the user's local timezone and flagged.
- Conflicting location evidence creates `needs_review` suggestions rather than silent overwrites.
- Mapbox failures do not block local data entry or Godot export.
- Hermes failures fall back to local three-line output.
- Godot export failures surface a visible status and keep the last successful export.

## Testing

Core tests:

- SQLite schema migration creates all production tables.
- Manual create/update/delete flows persist data.
- CSV importer accepts valid standard rows and reports invalid rows.
- Image EXIF GPS produces confirmed `gps_exif` evidence.
- Notes without GPS create inferred evidence only with non-authoritative provenance.
- PlaceProfile/world_nodes recompute from persisted data.
- Godot world state excludes raw private note/media content.
- Mapbox adapter receives only local places/traces and distinguishes confirmed vs inferred locations.
- Hermes payload contains semantic summaries only.

## Acceptance Criteria

The first production slice is complete when:

- A fresh Tauri install initializes SQLite and no longer depends on sample data for the main path.
- The user can manually create Place, Trace, Event, Note, and Media records.
- The user can import a standard CSV with places, traces, events, notes, and media metadata.
- Imported or manual records appear on Mapbox when a public token is configured.
- Image EXIF GPS is stored as confirmed location evidence.
- Note-derived locations are clearly marked as inferred, with confidence and review state.
- Layer 1/Layer 2 recompute from SQLite after import or manual edits.
- Hermes gateway is configurable and has a local fallback.
- `world_state.json` exports successfully and Godot reads it without raw private data.
- Tests and production build pass.
