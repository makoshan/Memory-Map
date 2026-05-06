import { describe, expect, it } from "vitest";
import { fileToProcessingFile } from "./MemoryRoom";

describe("fileToProcessingFile", () => {
  it("keeps uploaded image previews as persistent thumbnails for the memory page", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2026-05-05T10:00:00Z").getTime()
    });

    const processingFile = await fileToProcessingFile(file, {
      createPreviewDataUrl: () => Promise.resolve("data:image/jpeg;base64,THUMB")
    });

    expect(processingFile.type).toBe("image");
    expect(processingFile.previewUrl).toBe("data:image/jpeg;base64,THUMB");
  });

  it("does not persist the full source image as the batch preview", async () => {
    const bytes = new Uint8Array(64).fill(7);
    const file = new File([bytes], "large.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2026-05-05T10:00:00Z").getTime()
    });

    const processingFile = await fileToProcessingFile(file, {
      createPreviewDataUrl: () => Promise.resolve("data:image/jpeg;base64,TINY")
    });

    expect(processingFile.previewUrl).toBe("data:image/jpeg;base64,TINY");
    expect(processingFile.previewUrl).not.toContain("BwcHBwcHBwcH");
  });

  it("adds GPS sync evidence to batch image uploads when EXIF GPS is available", async () => {
    const jpeg = new File([new Uint8Array([1, 2, 3])], "photo.jpg", {
      type: "image/jpeg",
      lastModified: new Date("2026-05-05T10:00:00Z").getTime()
    });

    const processingFile = await fileToProcessingFile(jpeg, {
      parseGps: () => ({
        evidenceType: "gps_exif",
        longitude: 120.1285694444,
        latitude: 30.2777888889,
        confidence: 1,
        reviewState: "confirmed"
      })
    });

    expect(processingFile.syncEvidence).toMatchObject({
      placeKey: "gps:120.1286,30.2778",
      capturedAt: "2026-05-05T10:00:00.000Z",
      locationConfidence: 1,
      hermesSucceeded: false
    });
  });

  it("treats HEIC uploads with missing MIME as images so they can appear in memory", async () => {
    const file = new File([new Uint8Array([4, 5, 6])], "IMG_9128.HEIC", {
      type: "",
      lastModified: new Date("2026-05-05T10:00:00Z").getTime()
    });

    const processingFile = await fileToProcessingFile(file, {
      createPreviewDataUrl: () => Promise.resolve(undefined)
    });

    expect(processingFile.type).toBe("image");
    expect(processingFile.previewUrl).toBeUndefined();
  });
});
