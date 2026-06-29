import type {
  EventRecord,
  FeedbackEvent,
  HermesAnalysisJob,
  MediaAsset,
  Reflection,
  Skill,
  WorkbenchArtifact
} from "../domain/types";
import type { MemoryItem } from "../domain/memoryRoom";

const EVENTS_STORAGE_KEY = "memory-map.events";
const MEDIA_ASSETS_STORAGE_KEY = "memory-map.media-assets";
const MEMORY_ITEMS_STORAGE_KEY = "memory-map.memory-items";
const HERMES_JOBS_STORAGE_KEY = "memory-map.hermes-jobs";
const FEEDBACK_EVENTS_STORAGE_KEY = "memory-map.feedback-events";
const REFLECTIONS_STORAGE_KEY = "memory-map.reflections";
const SKILLS_STORAGE_KEY = "memory-map.skills";
const WORKBENCH_ARTIFACTS_STORAGE_KEY = "memory-map.workbench-artifacts";

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

export function loadStoredMemoryItems(fallback: MemoryItem[]): MemoryItem[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(MEMORY_ITEMS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoryItem[]) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredMemoryItems(items: MemoryItem[]) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  // Strip blob URLs since they don't survive reload — we keep only metadata.
  const sanitized = items.map((item) =>
    item.thumbnailUrl?.startsWith("blob:") ? { ...item, thumbnailUrl: undefined } : item
  );
  try {
    window.localStorage.setItem(MEMORY_ITEMS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "QuotaExceededError") {
      throw error;
    }
    const withoutThumbnails = sanitized.map((item) =>
      item.thumbnailUrl?.startsWith("data:") ? { ...item, thumbnailUrl: undefined } : item
    );
    window.localStorage.setItem(MEMORY_ITEMS_STORAGE_KEY, JSON.stringify(withoutThumbnails));
  }
}

export function loadStoredHermesJobs(fallback: HermesAnalysisJob[]): HermesAnalysisJob[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(HERMES_JOBS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HermesAnalysisJob[]) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredHermesJobs(jobs: HermesAnalysisJob[]) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(HERMES_JOBS_STORAGE_KEY, JSON.stringify(jobs.slice(0, 50)));
}

function loadStoredArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredArray<T>(key: string, records: T[], limit = 100) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(records.slice(0, limit)));
}

export function loadStoredFeedbackEvents(fallback: FeedbackEvent[]): FeedbackEvent[] {
  return loadStoredArray(FEEDBACK_EVENTS_STORAGE_KEY, fallback);
}

export function saveStoredFeedbackEvents(events: FeedbackEvent[]) {
  saveStoredArray(FEEDBACK_EVENTS_STORAGE_KEY, events, 200);
}

export function loadStoredReflections(fallback: Reflection[]): Reflection[] {
  return loadStoredArray(REFLECTIONS_STORAGE_KEY, fallback);
}

export function saveStoredReflections(reflections: Reflection[]) {
  saveStoredArray(REFLECTIONS_STORAGE_KEY, reflections, 100);
}

export function loadStoredSkills(fallback: Skill[]): Skill[] {
  return loadStoredArray(SKILLS_STORAGE_KEY, fallback);
}

export function saveStoredSkills(skills: Skill[]) {
  saveStoredArray(SKILLS_STORAGE_KEY, skills, 100);
}

export function loadStoredWorkbenchArtifacts(fallback: WorkbenchArtifact[]): WorkbenchArtifact[] {
  return loadStoredArray(WORKBENCH_ARTIFACTS_STORAGE_KEY, fallback);
}

export function saveStoredWorkbenchArtifacts(artifacts: WorkbenchArtifact[]) {
  saveStoredArray(WORKBENCH_ARTIFACTS_STORAGE_KEY, artifacts, 100);
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
