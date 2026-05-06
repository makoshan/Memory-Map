import { describe, expect, it } from "vitest";
import type { AgentContextSnapshot, MediaAsset } from "../domain/types";
import {
  createHermesAnalysisJob,
  createHermesImageMeaningRequest,
  createHermesMediaAnalysisPayload,
  parseHermesImageMeaningResponse
} from "./hermesAgent";

const context: AgentContextSnapshot = {
  id: "agent-context-alex",
  userId: "alex",
  createdAt: "2026-05-05T10:00:00+08:00",
  timeRange: "recent",
  eventSummary: "3 events across 2 semantic places",
  mediaAssetSummary: "1 imported assets ready for semantic analysis",
  placeProfileDiff: "西溪湿地 is life score=3.2",
  activeRisks: [],
  activeOpportunities: ["西溪湿地 恢复机会: 在 西溪湿地 安排一次低负荷恢复或散步记录。"],
  todayTasks: ["在 西溪湿地 安排一次低负荷恢复或散步记录。"],
  layer3Changes: "生活区 unlocked level 3 from visit_count=3",
  sentToHermes: false
};

describe("hermesAgent", () => {
  it("builds a media analysis payload with semantic content and no raw file path", () => {
    const asset: MediaAsset = {
      id: "media-audio-xixi",
      type: "audio",
      source: "recorder",
      filePath: "/private/raw/voice.m4a",
      fileName: "voice.m4a",
      transcript: "今天在西溪湿地走了一圈，状态比昨天好。",
      importedAt: "2026-05-05T09:30:00+08:00",
      placeHint: { placeId: "place-xixi" },
      analysisStatus: "pending"
    };

    const payload = createHermesMediaAnalysisPayload(asset, context);
    const serialized = JSON.stringify(payload);

    expect(payload.sessionId).toBe("memory-map-alex");
    expect(payload.metadata.privacy).toBe("semantic-summary-only");
    expect(payload.metadata.analysisType).toBe("media-analysis");
    expect(serialized).toContain("今天在西溪湿地走了一圈");
    expect(serialized).toContain("西溪湿地 恢复机会");
    expect(serialized).toContain("Return JSON");
    expect(serialized).not.toContain("/private/raw/voice.m4a");
  });

  it("creates a local Hermes analysis job that can be persisted before gateway send", () => {
    const asset: MediaAsset = {
      id: "media-note-xixi",
      type: "note",
      source: "manual",
      text: "把西溪湿地作为周末恢复点。",
      importedAt: "2026-05-05T09:30:00+08:00",
      analysisStatus: "pending"
    };
    const payload = createHermesMediaAnalysisPayload(asset, context);

    const job = createHermesAnalysisJob(asset, payload, "2026-05-05T10:01:00+08:00");

    expect(job.id).toBe("hermes-job-media-note-xixi");
    expect(job.mediaAssetId).toBe("media-note-xixi");
    expect(job.jobType).toBe("media-analysis");
    expect(job.inputSummary).toContain("note");
    expect(job.inputSummary).not.toContain("filePath");
    expect(job.status).toBe("pending");
  });

  it("builds an OpenAI-compatible image meaning request with inline image and place evidence", () => {
    const request = createHermesImageMeaningRequest({
      fileName: "IMG_9128.HEIC",
      imageDataUrl: "data:image/heic;base64,AAA",
      gps: {
        longitude: 120.1285694444,
        latitude: 30.2777888889,
        altitude: 11.18,
        horizontalError: 21.3
      },
      address: {
        formattedAddress: "浙江省杭州市西湖区翠苑街道黄姑山路39号颐高创业",
        roads: ["黄姑山路", "黄姑山横路"],
        pois: ["颐高广场A座", "颐高创业大厦"]
      }
    });

    expect(request.model).toBe("hermes-agent");
    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text" }),
        expect.objectContaining({
          type: "image_url",
          image_url: expect.objectContaining({ url: "data:image/heic;base64,AAA" })
        })
      ])
    );
    expect(JSON.stringify(request)).toContain("黄姑山路39号颐高创业");
    expect(JSON.stringify(request)).toContain("Return strict JSON");
  });

  it("parses a Hermes image meaning response into a stable local summary", () => {
    const meaning = parseHermesImageMeaningResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sceneSummary: "一张杭州黄姑山路附近的街区照片。",
              memoryMeaning: "记录一次现实地点停留，可用于补强杭州生活地图。",
              topics: ["place", "city"],
              placeRoleHint: "life",
              confidence: 0.82
            })
          }
        }
      ]
    });

    expect(meaning.sceneSummary).toContain("杭州");
    expect(meaning.memoryMeaning).toContain("地点停留");
    expect(meaning.topics).toEqual(["place", "city"]);
    expect(meaning.placeRoleHint).toBe("life");
    expect(meaning.confidence).toBe(0.82);
  });
});
