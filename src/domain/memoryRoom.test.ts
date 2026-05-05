import { describe, expect, it } from "vitest";
import { buildMemoryItem, detectCity, groupByCity, type ProcessingFile } from "./memoryRoom";

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
});
