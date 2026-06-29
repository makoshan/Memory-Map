import { afterEach, describe, expect, it } from "vitest";
import { events } from "../data/sampleData";
import type { FeedbackEvent, MediaAsset, Reflection, Skill, WorkbenchArtifact } from "../domain/types";
import type { MemoryItem } from "../domain/memoryRoom";
import {
  loadStoredEvents,
  loadStoredFeedbackEvents,
  loadStoredMediaAssets,
  loadStoredMemoryItems,
  loadStoredReflections,
  loadStoredSkills,
  loadStoredWorkbenchArtifacts,
  saveStoredEvents,
  saveStoredFeedbackEvents,
  saveStoredMediaAssets,
  saveStoredMemoryItems,
  saveStoredReflections,
  saveStoredSkills,
  saveStoredWorkbenchArtifacts
} from "./localStore";

describe("localStore", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("persists event records in the web preview store", () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value)
      }
    };

    saveStoredEvents(events.slice(0, 2));

    expect(loadStoredEvents([])).toEqual(events.slice(0, 2));
  });

  it("persists imported media assets in the web preview store", () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value)
      }
    };
    const assets: MediaAsset[] = [
      {
        id: "asset-note-1",
        type: "note",
        source: "manual",
        text: "Finished a quiet product review near Xixi.",
        importedAt: "2026-05-05T10:00:00+08:00",
        placeHint: { placeId: "place-xixi" },
        analysisStatus: "pending"
      }
    ];

    saveStoredMediaAssets(assets);

    expect(loadStoredMediaAssets([])).toEqual(assets);
  });

  it("keeps persistent data URL thumbnails while stripping temporary blob thumbnails", () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value)
      }
    };
    const items: MemoryItem[] = [
      {
        id: "mem-data-url",
        type: "image",
        title: "data url thumbnail",
        summary: "kept",
        capturedAt: "2026-05-05T10:00:00Z",
        capturedDate: "2026-05-05",
        thumbnailUrl: "data:image/jpeg;base64,AAAA",
        topics: ["memory"],
        fileName: "kept.jpg",
        fileSize: 10
      },
      {
        id: "mem-blob",
        type: "image",
        title: "blob thumbnail",
        summary: "stripped",
        capturedAt: "2026-05-05T10:00:00Z",
        capturedDate: "2026-05-05",
        thumbnailUrl: "blob:http://localhost/temp",
        topics: ["memory"],
        fileName: "stripped.jpg",
        fileSize: 10
      }
    ];

    saveStoredMemoryItems(items);

    expect(loadStoredMemoryItems([])[0].thumbnailUrl).toBe("data:image/jpeg;base64,AAAA");
    expect(loadStoredMemoryItems([])[1].thumbnailUrl).toBeUndefined();
  });

  it("drops oversized data URL thumbnails and retries when memory storage exceeds quota", () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (value.length > 900) {
            throw new DOMException("quota", "QuotaExceededError");
          }
          store.set(key, value);
        }
      }
    };
    const hugeThumbnail = `data:image/jpeg;base64,${"A".repeat(2_000)}`;
    const items: MemoryItem[] = [
      {
        id: "mem-huge",
        type: "image",
        title: "huge thumbnail",
        summary: "must keep metadata",
        capturedAt: "2026-05-05T10:00:00Z",
        capturedDate: "2026-05-05",
        thumbnailUrl: hugeThumbnail,
        topics: ["memory"],
        fileName: "huge.jpg",
        fileSize: 10_000_000
      }
    ];

    saveStoredMemoryItems(items);

    const [saved] = loadStoredMemoryItems([]);
    expect(saved.title).toBe("huge thumbnail");
    expect(saved.thumbnailUrl).toBeUndefined();
  });

  it("persists GUI office learning records in the web preview store", () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value)
      }
    };
    const feedbackEvents: FeedbackEvent[] = [
      {
        id: "feedback-1",
        targetType: "place_profile",
        targetId: "place-xixi",
        action: "confirm",
        createdAt: "2026-05-10T10:00:00+08:00"
      }
    ];
    const reflections: Reflection[] = [
      {
        id: "reflection-1",
        scope: "place",
        sourceEventIds: ["event-xixi-walk"],
        sourceFeedbackIds: ["feedback-1"],
        summary: "西溪湿地适合作为恢复节点。",
        confidence: 0.82,
        status: "confirmed",
        createdAt: "2026-05-10T10:05:00+08:00"
      }
    ];
    const skills: Skill[] = [
      {
        id: "skill-1",
        title: "恢复散步",
        trigger: "恢复机会出现",
        procedure: "安排 20 分钟散步。",
        sourceReflectionIds: ["reflection-1"],
        successCount: 0,
        failureCount: 0,
        status: "draft",
        createdAt: "2026-05-10T10:10:00+08:00",
        updatedAt: "2026-05-10T10:10:00+08:00"
      }
    ];
    const artifacts: WorkbenchArtifact[] = [
      {
        id: "artifact-1",
        artifactType: "place_inspector",
        title: "西溪湿地 地点检查台",
        targetType: "place_profile",
        targetId: "place-xixi",
        summary: "地点状态可检查。",
        modelClaimIds: [],
        feedbackEventIds: ["feedback-1"],
        status: "ready",
        createdAt: "2026-05-10T10:00:00+08:00",
        updatedAt: "2026-05-10T10:00:00+08:00"
      }
    ];

    saveStoredFeedbackEvents(feedbackEvents);
    saveStoredReflections(reflections);
    saveStoredSkills(skills);
    saveStoredWorkbenchArtifacts(artifacts);

    expect(loadStoredFeedbackEvents([])).toEqual(feedbackEvents);
    expect(loadStoredReflections([])).toEqual(reflections);
    expect(loadStoredSkills([])).toEqual(skills);
    expect(loadStoredWorkbenchArtifacts([])).toEqual(artifacts);
  });
});
