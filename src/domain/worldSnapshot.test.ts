import { describe, expect, it } from "vitest";
import { places, events, robotExhibitionMeaning, timelineStages } from "../data/sampleData";
import { appendEventRecord, createEventDraftFromMediaAsset, createMediaAssetRecord, createWorldSnapshot } from "./worldSnapshot";

describe("world snapshot", () => {
  it("rebuilds Layer 1, Layer 2, Layer 3, and AI output after a new event", () => {
    const before = createWorldSnapshot({ places, events, userId: "alex", timeline: timelineStages });
    const officeBefore = before.profiles.find((profile) => profile.placeId === "place-office");

    const nextEvents = appendEventRecord(events, {
      placeId: "place-office",
      tags: ["work"],
      steps: 600,
      mediaCount: 4,
      amount: 0,
      intensity: 0.7,
      valence: 0.4,
      startTime: "2026-05-04T21:30:00+08:00",
      endTime: "2026-05-04T22:00:00+08:00"
    });
    const after = createWorldSnapshot({ places, events: nextEvents, userId: "alex", timeline: timelineStages });
    const officeAfter = after.profiles.find((profile) => profile.placeId === "place-office");
    const officeNodeAfter = after.worldNodes.find((node) => node.placeId === "place-office");

    expect(officeAfter?.visitCount).toBe((officeBefore?.visitCount ?? 0) + 1);
    expect(officeNodeAfter?.unlockReason).toContain("media_count=6");
    expect(after.unlocks.map((unlock) => unlock.unlockKey)).toContain("memory-shelf");
    expect(after.aiSuggestion.conclusion).toContain("办公室");
    expect(after.godotWorldState.nodes.length).toBe(after.worldNodes.length);
  });

  it("turns a local import into a semantic event that updates the world", () => {
    const asset = createMediaAssetRecord(
      {
        type: "note",
        source: "manual",
        text: "A good design review with several product memories.",
        placeId: "place-office",
        capturedAt: "2026-05-05T11:00:00+08:00"
      },
      "2026-05-05T11:05:00+08:00"
    );
    const draft = createEventDraftFromMediaAsset(asset, "place-home", "work");
    const nextEvents = appendEventRecord(events, draft);
    const after = createWorldSnapshot({ places, events: nextEvents, mediaAssets: [asset], userId: "alex", timeline: timelineStages });
    const officeNodeAfter = after.worldNodes.find((node) => node.placeId === "place-office");

    expect(asset.analysisStatus).toBe("pending");
    expect(draft.placeId).toBe("place-office");
    expect(draft.mediaCount).toBe(1);
    expect(after.agentContext.mediaAssetSummary).toContain("1 imported assets");
    expect(after.opportunities.map((opportunity) => opportunity.type)).toContain("memory");
    expect(officeNodeAfter?.unlockReason).toContain("media_count=3");
  });

  it("keeps media-derived meaning in the app snapshot without leaking raw media paths to Godot", () => {
    const snapshot = createWorldSnapshot({
      places,
      events,
      eventMeanings: [robotExhibitionMeaning],
      userId: "alex",
      timeline: timelineStages
    });
    const godotPayload = JSON.stringify(snapshot.godotWorldState);

    expect(snapshot.eventMeanings[0].title).toBe("杭州刘小龙展会看机器人");
    expect(snapshot.eventMeanings[0].source.location).toBe("gps_exif");
    expect(snapshot.eventMeanings[0].placeMeaning).toBe("technology_exhibition");
    expect(godotPayload).not.toContain("IMG_9128.HEIC");
    expect(godotPayload).not.toContain("黄姑山路39号");
  });

  it("carries GUI office learning records without sending them to Godot", () => {
    const snapshot = createWorldSnapshot({
      places,
      events,
      userId: "alex",
      timeline: timelineStages,
      feedbackEvents: [
        {
          id: "feedback-place_profile-place-xixi-confirm-20260510100000",
          targetType: "place_profile",
          targetId: "place-xixi",
          action: "confirm",
          userNote: "这里确实是恢复点",
          createdAt: "2026-05-10T10:00:00+08:00"
        }
      ],
      reflections: [
        {
          id: "reflection-place-20260510100500",
          scope: "place",
          sourceEventIds: ["event-xixi-walk"],
          sourceFeedbackIds: ["feedback-place_profile-place-xixi-confirm-20260510100000"],
          summary: "西溪湿地的低负荷散步对恢复有效。",
          confidence: 0.82,
          status: "confirmed",
          createdAt: "2026-05-10T10:05:00+08:00"
        }
      ],
      skills: [
        {
          id: "skill-reflection-place-20260510100500",
          title: "西溪湿地恢复散步",
          trigger: "当恢复机会出现",
          procedure: "建议 20 分钟低负荷散步。",
          sourceReflectionIds: ["reflection-place-20260510100500"],
          successCount: 0,
          failureCount: 0,
          status: "draft",
          createdAt: "2026-05-10T10:10:00+08:00",
          updatedAt: "2026-05-10T10:10:00+08:00"
        }
      ],
      workbenchArtifacts: [
        {
          id: "workbench-place-inspector-place-xixi-20260510100000",
          artifactType: "place_inspector",
          title: "西溪湿地 地点检查台",
          targetType: "place_profile",
          targetId: "place-xixi",
          summary: "地点状态可检查、可修正、可批准。",
          modelClaimIds: [],
          feedbackEventIds: ["feedback-place_profile-place-xixi-confirm-20260510100000"],
          status: "ready",
          createdAt: "2026-05-10T10:00:00+08:00",
          updatedAt: "2026-05-10T10:00:00+08:00"
        }
      ]
    });

    expect(snapshot.feedbackEvents).toHaveLength(1);
    expect(snapshot.reflections[0].summary).toContain("恢复");
    expect(snapshot.skills[0].status).toBe("draft");
    expect(snapshot.workbenchArtifacts[0].artifactType).toBe("place_inspector");
    expect(JSON.stringify(snapshot.godotWorldState)).not.toContain("feedback-place_profile");
    expect(JSON.stringify(snapshot.godotWorldState)).not.toContain("地点检查台");
  });
});
