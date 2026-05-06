import { describe, expect, it } from "vitest";
import { createGpsWorldSyncEvidence, evaluateWorldSyncPipeline, summarizeWorldSyncEvidence } from "./worldSyncPipeline";

describe("evaluateWorldSyncPipeline", () => {
  it("keeps a single generated image event in evidence accumulation instead of syncing the world", () => {
    expect(evaluateWorldSyncPipeline({
      eventMeaningGenerated: true,
      samePlaceEventCount: 1,
      distinctVisitCount: 1,
      locationConfidence: 0.86,
      hermesSuccessCount: 1,
      worldExported: false
    })).toEqual({
      eventMeaning: "已生成 1 / 10，等待更多图片",
      placeProfile: "证据不足，同地点还需 9 张",
      layer3: "等待地点画像稳定",
      godotWorldState: "未导出",
      readyForPlaceProfile: false
    });
  });

  it("allows PlaceProfile aggregation only after place, visit, location, and Hermes evidence pass thresholds", () => {
    expect(evaluateWorldSyncPipeline({
      eventMeaningGenerated: true,
      samePlaceEventCount: 10,
      distinctVisitCount: 2,
      locationConfidence: 0.88,
      hermesSuccessCount: 2,
      worldExported: false
    })).toMatchObject({
      eventMeaning: "已生成 10 / 10，可聚合为地点画像",
      placeProfile: "地点画像稳定，等待生成世界区域",
      layer3: "地点画像稳定，准备生成世界建筑/区域",
      godotWorldState: "等待导出稳定世界状态",
      readyForPlaceProfile: true
    });
  });

  it("counts stored and current evidence only when they match the same place", () => {
    const current = {
      placeKey: "amap:百脑汇科技大厦",
      capturedAt: "2026-05-05T10:00:00Z",
      locationConfidence: 0.86,
      hermesSucceeded: true
    };
    const stored = [
      current,
      { ...current, capturedAt: "2026-05-05T10:10:00Z" },
      { ...current, capturedAt: "2026-05-05T10:20:00Z" },
      { ...current, capturedAt: "2026-05-05T10:30:00Z" },
      { ...current, placeKey: "amap:另一个地点", capturedAt: "2026-05-05T10:40:00Z" }
    ];

    expect(summarizeWorldSyncEvidence({ stored, current })).toMatchObject({
      eventMeaningGenerated: true,
      samePlaceEventCount: 4,
      distinctVisitCount: 1,
      locationConfidence: 0.86,
      hermesSuccessCount: 4
    });
  });

  it("creates stable GPS place keys for batch uploads from nearby EXIF coordinates", () => {
    expect(createGpsWorldSyncEvidence({
      longitude: 120.1285694444,
      latitude: 30.2777888889,
      capturedAt: "2026-05-05T10:00:00Z",
      hermesSucceeded: false
    })).toMatchObject({
      placeKey: "gps:120.1286,30.2778",
      placeName: "GPS 120.1286, 30.2778",
      locationConfidence: 1
    });
  });

  it("marks a place ready after 10 matching image events across two visits and two Hermes successes", () => {
    const stored = Array.from({ length: 10 }, (_, index) => ({
      placeKey: "amap:百脑汇科技大厦",
      capturedAt: index < 5 ? `2026-05-05T10:${String(index).padStart(2, "0")}:00Z` : `2026-05-05T12:${String(index).padStart(2, "0")}:00Z`,
      locationConfidence: 0.88,
      hermesSucceeded: index < 2
    }));

    const summary = summarizeWorldSyncEvidence({ stored, current: stored[9] });

    expect(evaluateWorldSyncPipeline(summary)).toMatchObject({
      eventMeaning: "已生成 10 / 10，可聚合为地点画像",
      readyForPlaceProfile: true
    });
  });
});
