# Amap Address Meaning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production slice that turns EXIF GPS and user notes into address evidence and explainable EventMeaning.

**Architecture:** Keep hard location facts separate from inferred meaning. A provider module converts WGS84 EXIF GPS to Amap coordinates and reverse geocodes an address/POI candidate; a domain module combines location evidence, visual hints, and notes into structured EventMeaning.

**Tech Stack:** TypeScript, Vitest, browser fetch API, existing Vite/React project.

---

### Task 1: Documentation

**Files:**
- Modify: `docs/product.md`
- Modify: `docs/superpowers/specs/2026-05-05-production-local-data-design.md`
- Create: `docs/geo-meaning-pipeline.md`

- [ ] **Step 1: Document the evidence contract**

Add a document explaining:

```markdown
# Geo Meaning Pipeline

Memory Map treats EXIF GPS as hard location evidence and treats address, POI, image interpretation, and note interpretation as meaning evidence.

Pipeline:

1. Extract WGS84 GPS from image EXIF.
2. Store it as `gps_exif` with `confidence=1.0`.
3. Convert WGS84 to Amap/GCJ-02 when using Amap in China.
4. Reverse geocode the converted coordinate.
5. Store formatted address and POI candidates as `address_evidence`.
6. Combine GPS, address, image content, and user notes into `EventMeaning`.

Never overwrite EXIF GPS with inferred address or note context.
```

- [ ] **Step 2: Verify docs render as Markdown**

Run: `sed -n '1,220p' docs/geo-meaning-pipeline.md`

Expected: document includes pipeline and hard/inferred evidence distinction.

### Task 2: Amap Geocoder

**Files:**
- Create: `src/integrations/amapGeocoder.ts`
- Create: `src/integrations/amapGeocoder.test.ts`

- [ ] **Step 1: Write failing tests**

Tests should cover:

```ts
import { describe, expect, it } from "vitest";
import { buildAmapConvertUrl, buildAmapRegeoUrl, parseAmapRegeo } from "./amapGeocoder";

describe("amapGeocoder", () => {
  it("builds coordinate conversion URLs without leaking key into logs", () => {
    const url = buildAmapConvertUrl({
      key: "test-key",
      longitude: 120.1285694444,
      latitude: 30.2777888889
    });

    expect(url.toString()).toContain("coordsys=gps");
    expect(url.searchParams.get("locations")).toBe("120.1285694444,30.2777888889");
  });

  it("builds reverse geocode URLs for converted Amap coordinates", () => {
    const url = buildAmapRegeoUrl({
      key: "test-key",
      amapLocation: "120.133333062066,30.275500488282"
    });

    expect(url.searchParams.get("extensions")).toBe("all");
    expect(url.searchParams.get("radius")).toBe("1000");
  });

  it("parses formatted address and POI candidates", () => {
    const parsed = parseAmapRegeo({
      status: "1",
      info: "OK",
      infocode: "10000",
      regeocode: {
        formatted_address: "浙江省杭州市西湖区翠苑街道黄姑山路39号颐高创业",
        addressComponent: {
          province: "浙江省",
          city: "杭州市",
          district: "西湖区",
          township: "翠苑街道"
        },
        pois: [
          { name: "颐高广场A座", type: "商务住宅;楼宇;商务写字楼", distance: "67.6436", direction: "西" }
        ],
        roads: [
          { name: "黄姑山路", distance: "22.2237", direction: "西" }
        ]
      }
    });

    expect(parsed.formattedAddress).toContain("颐高创业");
    expect(parsed.pois[0].name).toBe("颐高广场A座");
    expect(parsed.roads[0].name).toBe("黄姑山路");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- --run src/integrations/amapGeocoder.test.ts`

Expected: FAIL because `src/integrations/amapGeocoder.ts` does not exist.

- [ ] **Step 3: Implement geocoder helpers**

Create URL builders, response parser, and an async `reverseGeocodeExifGps` function that calls conversion first and reverse geocode second.

- [ ] **Step 4: Run geocoder tests**

Run: `npm test -- --run src/integrations/amapGeocoder.test.ts`

Expected: PASS.

### Task 3: Event Meaning Domain

**Files:**
- Create: `src/domain/eventMeaning.ts`
- Create: `src/domain/eventMeaning.test.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing tests**

Tests should cover:

```ts
import { describe, expect, it } from "vitest";
import { createEventMeaning } from "./eventMeaning";

describe("createEventMeaning", () => {
  it("keeps EXIF GPS as hard evidence while combining address and note meaning", () => {
    const meaning = createEventMeaning({
      mediaId: "media-img-9128",
      capturedAt: "2026-05-03T16:13:13+08:00",
      gpsEvidence: {
        evidenceType: "gps_exif",
        latitude: 30.2777888889,
        longitude: 120.1285694444,
        confidence: 1,
        reviewState: "confirmed"
      },
      addressEvidence: {
        provider: "amap",
        formattedAddress: "浙江省杭州市西湖区翠苑街道黄姑山路39号颐高创业",
        pois: [{ name: "颐高广场A座", type: "商务住宅;楼宇;商务写字楼", distanceMeters: 67.64 }]
      },
      visualHints: ["robot", "smart hardware", "exhibition display"],
      userNote: "杭州刘小龙展会，拍了很多机器人"
    });

    expect(meaning.title).toBe("杭州刘小龙展会看机器人");
    expect(meaning.activity).toBe("exhibition_visit");
    expect(meaning.topics).toContain("robotics");
    expect(meaning.source.location).toBe("gps_exif");
    expect(meaning.confidence.location).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- --run src/domain/eventMeaning.test.ts`

Expected: FAIL because `eventMeaning.ts` does not exist.

- [ ] **Step 3: Implement EventMeaning types and logic**

Create deterministic rules for exhibition/robotics notes, topic extraction, address source handling, and confidence calculation.

- [ ] **Step 4: Run meaning tests**

Run: `npm test -- --run src/domain/eventMeaning.test.ts`

Expected: PASS.

### Task 4: Sample Evidence

**Files:**
- Modify: `src/data/sampleData.ts`
- Modify: `src/domain/worldSnapshot.ts`
- Test: `src/domain/worldSnapshot.test.ts`

- [ ] **Step 1: Add a sample media-derived EventMeaning**

Add an example for `IMG_9128.HEIC` using:

```ts
latitude: 30.2777888889
longitude: 120.1285694444
formattedAddress: "浙江省杭州市西湖区翠苑街道黄姑山路39号颐高创业"
note: "杭州刘小龙展会，拍了很多机器人"
```

- [ ] **Step 2: Expose meaning in snapshot**

Extend `WorldSnapshot` with `eventMeanings` and include them in agent context or local demo output without sending raw image paths to Godot.

- [ ] **Step 3: Run snapshot tests**

Run: `npm test -- --run src/domain/worldSnapshot.test.ts`

Expected: PASS and confirm raw private media paths are not exported to Godot.

### Task 5: Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run full tests**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 3: Run Godot export**

Run: `npm run export:godot`

Expected: `public/godot/world_state.json` and `godot/data/world_state.json` are exported.

## Self-Review

This plan covers the approved first slice: docs, Amap conversion/reverse geocoding, hard GPS evidence, inferred address evidence, EventMeaning, tests, and verification. It intentionally does not implement full CSV/manual CRUD in this slice; those remain in the broader production spec.
