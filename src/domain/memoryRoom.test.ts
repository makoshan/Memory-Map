import { describe, expect, it } from "vitest";
import {
  buildAgentContext,
  buildMediaAsset,
  buildMemoryItem,
  detectCity,
  findDuplicateMemoryItem,
  groupByCity,
  type ProcessingFile
} from "./memoryRoom";
import { createHermesMediaAnalysisPayload, createHermesAnalysisJob } from "../integrations/hermesAgent";

describe("memoryRoom", () => {
  it("detects city from filename keywords", () => {
    expect(detectCity("IMG_HZ_2024.jpg")).toBe("杭州");
    expect(detectCity("shenzhen-meetup.mp3")).toBe("深圳");
    expect(detectCity("Tokyo neighbors.md")).toBe("东京");
    expect(detectCity("random_note")).toBeUndefined();
  });

  it("builds an image memory item with city extracted from filename", () => {
    const file: ProcessingFile = {
      name: "杭州刘小龙展会.jpg",
      size: 4_200_000,
      type: "image",
      lastModified: new Date("2026-05-03T16:13:13Z").getTime(),
      previewUrl: "blob:preview"
    };

    const item = buildMemoryItem(file, { sequence: 0 });

    expect(item.type).toBe("image");
    expect(item.city).toBe("杭州");
    expect(item.title).toContain("杭州");
    expect(item.thumbnailUrl).toBe("blob:preview");
    expect(item.capturedDate).toBe("2026-05-03");
    expect(item.topics.length).toBeGreaterThan(0);
  });

  it("uses note text for the title when filename is generic", () => {
    const file: ProcessingFile = {
      name: "note.md",
      size: 320,
      type: "note",
      lastModified: new Date("2026-04-01T08:30:00Z").getTime(),
      noteText: "杭州刘小龙展会，看了很多机器人和 AI 硬件"
    };

    const item = buildMemoryItem(file, { sequence: 1 });

    expect(item.type).toBe("note");
    expect(item.city).toBe("杭州");
    expect(item.summary).toContain("机器人");
    expect(item.topics).toContain("robotics");
  });

  it("aggregates memory items by city descending", () => {
    const items = [
      { id: "a", type: "image" as const, title: "1", summary: "", city: "杭州", capturedAt: "", capturedDate: "", topics: [], fileName: "", fileSize: 0 },
      { id: "b", type: "image" as const, title: "2", summary: "", city: "杭州", capturedAt: "", capturedDate: "", topics: [], fileName: "", fileSize: 0 },
      { id: "c", type: "note" as const, title: "3", summary: "", city: "深圳", capturedAt: "", capturedDate: "", topics: [], fileName: "", fileSize: 0 },
      { id: "d", type: "audio" as const, title: "4", summary: "", capturedAt: "", capturedDate: "", topics: [], fileName: "", fileSize: 0 }
    ];

    const rows = groupByCity(items);

    expect(rows[0]).toMatchObject({ city: "杭州", count: 2 });
    expect(rows[1].count).toBe(1);
    expect(rows.find((row) => row.city === "未分配")?.count).toBe(1);
    expect(rows[0].share).toBeCloseTo(0.5);
  });

  it("returns empty distribution when no items", () => {
    expect(groupByCity([])).toEqual([]);
  });

  it("detects a duplicate imported image by file name and size before archiving again", () => {
    const file: ProcessingFile = {
      name: "IMG_9128.HEIC",
      size: 3_048_000,
      type: "image",
      lastModified: new Date("2026-05-05T14:48:17Z").getTime()
    };
    const existing = buildMemoryItem(file, { sequence: 0 });
    const copiedSameImage: ProcessingFile = {
      ...file,
      lastModified: new Date("2026-05-05T15:10:00Z").getTime()
    };

    expect(findDuplicateMemoryItem([existing], copiedSameImage)?.id).toBe(existing.id);
    expect(findDuplicateMemoryItem([existing], { ...file, size: file.size + 1 })).toBeUndefined();
  });

  it("stores world sync evidence on imported memory items", () => {
    const file: ProcessingFile = {
      name: "bainao-hui.jpg",
      size: 4_200_000,
      type: "image",
      lastModified: new Date("2026-05-05T10:00:00Z").getTime()
    };
    const syncEvidence = {
      placeKey: "amap:百脑汇科技大厦",
      placeName: "百脑汇科技大厦",
      capturedAt: "2026-05-05T10:00:00.000Z",
      locationConfidence: 0.86,
      hermesSucceeded: true
    };

    const item = buildMemoryItem(file, { sequence: 1, syncEvidence });

    expect(item.syncEvidence).toEqual(syncEvidence);
  });

  it("uses sync evidence carried by batch processing files", () => {
    const syncEvidence = {
      placeKey: "gps:120.1286,30.2778",
      placeName: "GPS 120.1286, 30.2778",
      capturedAt: "2026-05-05T10:00:00.000Z",
      locationConfidence: 1,
      hermesSucceeded: false
    };
    const file: ProcessingFile = {
      name: "batch-photo.jpg",
      size: 4_200_000,
      type: "image",
      lastModified: new Date(syncEvidence.capturedAt).getTime(),
      syncEvidence
    };

    expect(buildMemoryItem(file, { sequence: 2 }).syncEvidence).toEqual(syncEvidence);
  });

  it("builds a MediaAsset and AgentContext that round-trip into a Hermes payload", () => {
    const file: ProcessingFile = {
      name: "杭州刘小龙展会.jpg",
      size: 4_200_000,
      type: "image",
      lastModified: new Date("2026-05-03T16:13:13Z").getTime(),
      previewUrl: "blob:preview"
    };
    const item = buildMemoryItem(file, { sequence: 0 });
    const importedAt = "2026-05-03T16:14:00Z";
    const asset = buildMediaAsset(file, item, importedAt);
    const context = buildAgentContext(item, importedAt);

    expect(asset.id).toBe(item.id);
    expect(asset.source).toBe("file_import");
    expect(asset.placeHint?.placeId).toBe("杭州");
    expect(asset.analysisStatus).toBe("pending");

    expect(context.userId).toBe("alex-chen");
    expect(context.mediaAssetSummary).toContain(file.name);
    expect(context.placeProfileDiff).toContain("杭州");

    const payload = createHermesMediaAnalysisPayload(asset, context);
    expect(payload.metadata.analysisType).toBe("media-analysis");
    expect(payload.metadata.mediaAssetType).toBe("image");
    const userMessage = payload.messages.find((message) => message.role === "user");
    expect(userMessage?.content).toContain(item.fileName);
    expect(userMessage?.content).toContain("Place hint: 杭州");

    const job = createHermesAnalysisJob(asset, payload, importedAt);
    expect(job.mediaAssetId).toBe(item.id);
    expect(job.jobType).toBe("media-analysis");
    expect(job.status).toBe("pending");
    expect(JSON.parse(job.inputSummary).privacy).toBe("semantic-summary-only");
  });
});
