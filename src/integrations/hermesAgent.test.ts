import { describe, expect, it } from "vitest";
import type { AgentContextSnapshot, MediaAsset } from "../domain/types";
import { createHermesAnalysisJob, createHermesMediaAnalysisPayload } from "./hermesAgent";

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
});
