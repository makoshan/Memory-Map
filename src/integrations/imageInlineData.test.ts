import { describe, expect, it } from "vitest";
import {
  estimateDataUrlBytes,
  estimateDataUrlRequestBytes,
  needsHermesImageCompression,
  nextCompressionPlan
} from "./imageInlineData";

describe("imageInlineData", () => {
  it("estimates decoded bytes from a base64 data URL", () => {
    expect(estimateDataUrlBytes("data:image/jpeg;base64,AAAA")).toBe(3);
    expect(estimateDataUrlBytes("data:image/jpeg;base64,AAAAAAAA")).toBe(6);
  });

  it("estimates request bytes from the base64 data URL text itself", () => {
    expect(estimateDataUrlRequestBytes("data:image/jpeg;base64,AAAA")).toBe(27);
  });

  it("flags image data that would exceed the Hermes inline payload budget", () => {
    expect(needsHermesImageCompression("data:image/jpeg;base64,AAAA", 4)).toBe(false);
    expect(needsHermesImageCompression("data:image/jpeg;base64,AAAAAAAA", 4)).toBe(true);
  });

  it("flags request payloads that fit decoded byte budget but exceed inline request budget", () => {
    const base64 = "A".repeat(120);
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    expect(estimateDataUrlBytes(dataUrl)).toBe(90);
    expect(needsHermesImageCompression(dataUrl, 100, 100)).toBe(true);
  });

  it("steps image compression down until Hermes inline data fits", () => {
    expect(nextCompressionPlan({ maxEdge: 1280, quality: 0.72 })).toEqual({ maxEdge: 1024, quality: 0.64 });
    expect(nextCompressionPlan({ maxEdge: 1024, quality: 0.64 })).toEqual({ maxEdge: 896, quality: 0.58 });
    expect(nextCompressionPlan({ maxEdge: 512, quality: 0.5 })).toBeUndefined();
  });
});
