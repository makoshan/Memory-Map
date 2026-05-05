import { afterEach, describe, expect, it } from "vitest";
import { events } from "../data/sampleData";
import type { MediaAsset } from "../domain/types";
import { loadStoredEvents, loadStoredMediaAssets, saveStoredEvents, saveStoredMediaAssets } from "./localStore";

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
});
