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
});
