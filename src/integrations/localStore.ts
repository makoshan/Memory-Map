import type { EventRecord, MediaAsset } from "../domain/types";

const EVENTS_STORAGE_KEY = "memory-map.events";
const MEDIA_ASSETS_STORAGE_KEY = "memory-map.media-assets";

export type LocalSnapshotStatus = {
  status: "ready" | "web-preview" | "error";
  source: "tauri-sqlite" | "sample-data";
  detail?: string;
};

export function loadLocalSnapshot(): LocalSnapshotStatus {
  if (typeof window === "undefined") {
    return { status: "web-preview", source: "sample-data" };
  }

  const isTauri = "__TAURI_INTERNALS__" in window;

  return isTauri
    ? { status: "ready", source: "tauri-sqlite" }
    : { status: "web-preview", source: "sample-data" };
}

export function loadStoredEvents(fallback: EventRecord[]): EventRecord[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as EventRecord[] : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredEvents(events: EventRecord[]) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

export function loadStoredMediaAssets(fallback: MediaAsset[]): MediaAsset[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(MEDIA_ASSETS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as MediaAsset[] : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredMediaAssets(assets: MediaAsset[]) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(MEDIA_ASSETS_STORAGE_KEY, JSON.stringify(assets));
}

export async function initializeLocalStore(): Promise<LocalSnapshotStatus> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return { status: "web-preview", source: "sample-data" };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("init_database");
    return { status: "ready", source: "tauri-sqlite" };
  } catch (error) {
    return {
      status: "error",
      source: "tauri-sqlite",
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}
