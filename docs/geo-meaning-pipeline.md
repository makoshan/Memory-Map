# Geo Meaning Pipeline

Memory Map treats EXIF GPS as hard location evidence and treats address, POI, image interpretation, and note interpretation as meaning evidence.

The goal is not to collect coordinates. The goal is to turn real-world evidence into an explainable life event: what happened, where it happened, why it mattered, and how the user's world should change.

## Pipeline

1. Extract WGS84 GPS from image EXIF.
2. Store it as `gps_exif` with `confidence=1.0` and `review_state=confirmed`.
3. Convert WGS84 to Amap/GCJ-02 when using Amap in China.
4. Reverse geocode the converted coordinate.
5. Store formatted address, roads, and POI candidates as `address_evidence`.
6. Analyze visible image content into visual hints.
7. Parse user notes into named places, people, topics, and intent.
8. Combine GPS, address, image content, and user notes into `EventMeaning`.

Never overwrite EXIF GPS with inferred address or note context.

## Evidence Types

- `gps_exif`: Hard coordinates from image EXIF.
- `gps_trace`: Hard coordinates from a recorded or imported trace.
- `manual_place`: User-entered coordinates.
- `address_evidence`: Address or POI returned by a geocoder.
- `image_scene_analysis`: Visual objects, scene type, and visible text from media.
- `user_note`: User-provided meaning, context, or correction.
- `note_time_context`: Inferred city or place from surrounding time and movement data.

## Amap Flow

iPhone EXIF coordinates are WGS84. Amap reverse geocoding works best after converting GPS/WGS84 coordinates to Amap/GCJ-02:

```text
EXIF WGS84 coordinate
-> Amap coordinate convert with coordsys=gps
-> Amap reverse geocode
-> address_evidence
```

For `IMG_9128.HEIC`, the hard GPS evidence was:

```json
{
  "latitude": 30.2777888889,
  "longitude": 120.1285694444,
  "evidenceType": "gps_exif",
  "confidence": 1.0,
  "reviewState": "confirmed"
}
```

Amap converted it to:

```json
{
  "longitude": 120.133333062066,
  "latitude": 30.275500488282,
  "coordSystem": "gcj02",
  "provider": "amap"
}
```

The reverse geocode result placed the image around `浙江省杭州市西湖区翠苑街道黄姑山路39号颐高创业`, with nearby POI candidates including `颐高广场A座` and `颐高创业大厦`.

## Meaning Example

User note:

```text
杭州刘小龙展会，拍了很多机器人
```

Image meaning:

```text
robotics, smart hardware, exhibition display
```

Final EventMeaning:

```json
{
  "title": "杭州刘小龙展会看机器人",
  "activity": "exhibition_visit",
  "topics": ["robotics", "AI hardware", "design research"],
  "placeMeaning": "technology_exhibition",
  "source": {
    "location": "gps_exif",
    "address": "amap",
    "visual": "image_scene_analysis",
    "note": "user_note"
  },
  "confidence": {
    "location": 1.0,
    "address": 0.86,
    "visual": 0.72,
    "note": 0.95,
    "overall": 0.88
  }
}
```

This meaning can update Event tags, PlaceProfile score, AI suggestions, search, memory-room contents, and Godot Layer 3 unlocks.
