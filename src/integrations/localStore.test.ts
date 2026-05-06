import { afterEach, describe, expect, it } from "vitest";
import { events } from "../data/sampleData";
import type { MediaAsset } from "../domain/types";
import type { MemoryItem } from "../domain/memoryRoom";
import {
  loadStoredEvents,
  loadStoredMediaAssets,
  loadStoredMemoryItems,
  saveStoredEvents,
  saveStoredMediaAssets,
  saveStoredMemoryItems
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
});
