import { createEventMeaning } from "./eventMeaning";
import type { AgentContextSnapshot, MediaAsset } from "./types";
import type { WorldSyncEvidence } from "./worldSyncPipeline";

export type MemoryItemType = "image" | "audio" | "note";

export type ProcessingFile = {
  name: string;
  size: number;
  type: MemoryItemType;
  lastModified: number;
  previewUrl?: string;
  noteText?: string;
  syncEvidence?: WorldSyncEvidence;
};

export type MemoryItem = {
  id: string;
  type: MemoryItemType;
  title: string;
  summary: string;
  city?: string;
  capturedAt: string;
  capturedDate: string;
  thumbnailUrl?: string;
  topics: string[];
  fileName: string;
  fileSize: number;
  filePath?: string;
  sha256?: string;
  syncEvidence?: WorldSyncEvidence;
};

export type CityShare = {
  city: string;
  count: number;
  share: number;
};

const KNOWN_CITIES: Array<{ keys: string[]; city: string }> = [
  { keys: ["杭州", "hangzhou", "hgh", "hz"], city: "杭州" },
  { keys: ["深圳", "shenzhen", "szx", "sz"], city: "深圳" },
  { keys: ["上海", "shanghai", "pvg", "sha"], city: "上海" },
  { keys: ["北京", "beijing", "pek", "bjs"], city: "北京" },
  { keys: ["东京", "tokyo", "hnd", "nrt"], city: "东京" },
  { keys: ["伦敦", "london", "lhr", "lon"], city: "伦敦" },
  { keys: ["纽约", "new york", "newyork", "nyc"], city: "纽约" },
  { keys: ["洛杉矶", "los angeles", "la"], city: "洛杉矶" },
  { keys: ["日照", "rizhao"], city: "日照" }
];

export function detectCity(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const entry of KNOWN_CITIES) {
    if (entry.keys.some((key) => lower.includes(key.toLowerCase()))) {
      return entry.city;
    }
  }
  return undefined;
}

function formatDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

function inferTitleFromName(file: ProcessingFile, fallback: string) {
  const stem = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  if (stem.length === 0) return fallback;
  if (stem.length > 24) return `${stem.slice(0, 24)}…`;
  return stem;
}

function shortPreview(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 60) return clean;
  return `${clean.slice(0, 60)}…`;
}

export function buildMemoryItem(
  file: ProcessingFile,
  options: { sequence: number; userNoteOverride?: string; syncEvidence?: WorldSyncEvidence } = { sequence: 0 }
): MemoryItem {
  const capturedAt = new Date(file.lastModified).toISOString();
  const userNote = file.noteText ?? options.userNoteOverride ?? file.name;
  const city = detectCity(`${file.name} ${userNote}`);

  const meaning = createEventMeaning({
    capturedAt,
    visualHints: file.type === "image" ? ["photo", "imported"] : [],
    userNote,
    noteLocationContext: city
      ? {
          evidenceType: "note_explicit_place",
          city,
          confidence: 0.6,
          reviewState: "needs_review"
        }
      : undefined
  });

  const fallbackTitle =
    file.type === "audio" ? "未命名录音" : file.type === "note" ? "未命名笔记" : "未命名照片";

  const title =
    meaning.title && meaning.title !== "未命名记忆事件"
      ? meaning.title
      : inferTitleFromName(file, fallbackTitle);

  const summaryBase =
    file.type === "note" && file.noteText
      ? shortPreview(file.noteText)
      : meaning.summary;

  return {
    id: `mem-${file.lastModified}-${options.sequence}`,
    type: file.type,
    title,
    summary: summaryBase,
    city,
    capturedAt,
    capturedDate: formatDate(file.lastModified),
    thumbnailUrl: file.previewUrl,
    topics: meaning.topics,
    fileName: file.name,
    fileSize: file.size,
    syncEvidence: options.syncEvidence ?? file.syncEvidence
  };
}

export function buildMediaAsset(file: ProcessingFile, item: MemoryItem, importedAt = new Date().toISOString()): MediaAsset {
  return {
    id: item.id,
    type: item.type,
    source: "file_import",
    fileName: file.name,
    text: file.noteText,
    capturedAt: item.capturedAt,
    importedAt,
    placeHint: item.city ? { placeId: item.city } : undefined,
    analysisStatus: "pending"
  };
}

function normalizedFileName(name: string) {
  return name.trim().toLowerCase();
}

export function findDuplicateMemoryItem(items: MemoryItem[], file: Pick<ProcessingFile, "name" | "size" | "type">) {
  const name = normalizedFileName(file.name);
  return items.find((item) =>
    item.type === file.type &&
    normalizedFileName(item.fileName) === name &&
    item.fileSize === file.size
  );
}

export function buildAgentContext(item: MemoryItem, importedAt = new Date().toISOString()): AgentContextSnapshot {
  return {
    id: `ctx-${item.id}`,
    userId: "alex-chen",
    createdAt: importedAt,
    timeRange: item.capturedDate,
    eventSummary: item.summary,
    mediaAssetSummary: `1 ${item.type} · ${item.fileName}`,
    placeProfileDiff: item.city ? `${item.city} memory weight +1` : "unbound location",
    activeRisks: [],
    activeOpportunities: item.topics,
    todayTasks: [],
    layer3Changes: item.city ? `${item.city} memory node refresh` : "memory_room update",
    sentToHermes: false
  };
}

export function groupByCity(items: MemoryItem[]): CityShare[] {
  if (items.length === 0) return [];
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.city ?? "未分配";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = items.length;
  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}
