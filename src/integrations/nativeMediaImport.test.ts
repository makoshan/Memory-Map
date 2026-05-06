import { describe, expect, it, vi } from "vitest";
import { importMediaFilesWithNativeSidecar } from "./nativeMediaImport";

describe("importMediaFilesWithNativeSidecar", () => {
  it("delegates file paths to the Tauri sidecar command and returns structured memory items", async () => {
    const invoke = vi.fn().mockResolvedValue({
      items: [
        {
          id: "mem-native-abc123",
          type: "image",
          title: "IMG 0001",
          summary: "Imported from native sidecar",
          capturedAt: "2026-05-06T10:00:00.000Z",
          capturedDate: "2026-05-06",
          thumbnailUrl: "memory-map://media/thumbnails/abc123.jpg",
          topics: ["memory", "photo"],
          fileName: "IMG_0001.HEIC",
          fileSize: 1234,
          sha256: "abc123",
          filePath: "memory-map://media/originals/abc123.heic"
        }
      ]
    });

    const result = await importMediaFilesWithNativeSidecar(
      ["/Users/alex/Pictures/IMG_0001.HEIC"],
      invoke
    );

    expect(invoke).toHaveBeenCalledWith("import_media_files", {
      paths: ["/Users/alex/Pictures/IMG_0001.HEIC"]
    });
    expect(result.items[0]).toMatchObject({
      id: "mem-native-abc123",
      sha256: "abc123",
      filePath: "memory-map://media/originals/abc123.heic"
    });
  });

  it("does not call the native command when no file paths are provided", async () => {
    const invoke = vi.fn();

    const result = await importMediaFilesWithNativeSidecar([], invoke);

    expect(invoke).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [] });
  });
});
