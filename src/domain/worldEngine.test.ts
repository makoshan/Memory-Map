import { describe, expect, it } from "vitest";
import {
  buildAgentContext,
  buildPlaceProfile,
  generateOpportunities,
  generateUnlocks,
  generateWorldNode
} from "./worldEngine";
import type { EventRecord, MediaAsset, Place } from "./types";

const xixi: Place = {
  id: "place-xixi",
  name: "西溪湿地",
  lat: 30.266,
  lng: 120.064,
  poiType: "park",
  admin: { city: "杭州", district: "西湖区" },
  env: { humidity: 84, temp: 24, aqi: 28 }
};

const events: EventRecord[] = [
  {
    id: "event-walk",
    placeId: "place-xixi",
    startTime: "2026-05-03T08:30:00+08:00",
    endTime: "2026-05-03T09:30:00+08:00",
    tags: ["exercise", "life"],
    steps: 8200,
    mediaCount: 3,
    intensity: 0.7,
    valence: 0.8
  },
  {
    id: "event-work",
    placeId: "place-xixi",
    startTime: "2026-05-04T10:00:00+08:00",
    endTime: "2026-05-04T11:00:00+08:00",
    tags: ["work"],
    steps: 900,
    mediaCount: 2,
    intensity: 0.5,
    valence: 0.2
  },
  {
    id: "event-finance",
    placeId: "place-xixi",
    startTime: "2026-05-04T16:00:00+08:00",
    tags: ["finance"],
    steps: 200,
    mediaCount: 0,
    amount: 568.7,
    intensity: 0.4,
    valence: 0.1
  }
];

describe("world engine", () => {
  it("builds a Layer 1 profile from real events and place facts", () => {
    const profile = buildPlaceProfile(xixi, events);

    expect(profile.placeId).toBe("place-xixi");
    expect(profile.visitCount).toBe(3);
    expect(profile.mediaCount).toBe(5);
    expect(profile.steps).toBe(9300);
    expect(profile.role).toBe("life");
    expect(profile.score).toBeGreaterThan(2);
    expect(profile.recovery).toBeGreaterThan(0.6);
    expect(profile.dampPenalty).toBeGreaterThan(0);
  });

  it("generates a personal Layer 3 world node from Layer 1", () => {
    const profile = buildPlaceProfile(xixi, events);
    const node = generateWorldNode(profile);

    expect(node.id).toBe("world-place-xixi");
    expect(node.placeId).toBe("place-xixi");
    expect(node.nodeType).toBe("生活区");
    expect(node.size).toBeGreaterThan(1);
    expect(node.vegetationDensity).toBeGreaterThan(0.7);
    expect(node.waterLevel).toBeGreaterThan(0.5);
    expect(node.unlockedRooms).toContain("生活区");
    expect(node.unlockReason).toContain("visit_count");
  });

  it("unlocks game content from Layer 1 thresholds instead of fixed levels", () => {
    const profile = buildPlaceProfile(xixi, events);
    const unlocks = generateUnlocks(profile);

    expect(unlocks.map((unlock) => unlock.unlockKey)).toContain("place-node");
    expect(unlocks.map((unlock) => unlock.unlockKey)).toContain("memory-shelf");
    expect(unlocks.map((unlock) => unlock.unlockKey)).toContain("recovery-garden");
  });

  it("builds the safe Hermes context from semantic summaries only", () => {
    const profile = buildPlaceProfile(xixi, events);
    const node = generateWorldNode(profile);
    const opportunities = generateOpportunities([profile], events);
    const mediaAssets: MediaAsset[] = [
      {
        id: "media-audio-xixi",
        type: "audio",
        source: "recorder",
        transcript: "今天在西溪湿地散步，状态明显恢复。",
        importedAt: "2026-05-05T09:00:00+08:00",
        placeHint: { placeId: "place-xixi" },
        analysisStatus: "pending"
      }
    ];
    const context = buildAgentContext({
      userId: "user-alex",
      events,
      profiles: [profile],
      worldNodes: [node],
      mediaAssets,
      opportunities
    });

    expect(context.userId).toBe("user-alex");
    expect(context.eventSummary).toContain("3 events");
    expect(context.mediaAssetSummary).toContain("1 imported assets");
    expect(context.placeProfileDiff).toContain("西溪湿地");
    expect(context.activeOpportunities[0]).toContain("恢复");
    expect(context.layer3Changes).toContain("生活区");
    expect(JSON.stringify(context)).not.toContain("lat");
    expect(JSON.stringify(context)).not.toContain("lng");
    expect(JSON.stringify(context)).not.toContain("voice.m4a");
  });

  it("generates recovery, memory, and work opportunities from Layer 1 evidence", () => {
    const recoveryProfile = buildPlaceProfile(xixi, events);
    const officeProfile = buildPlaceProfile(
      { ...xixi, id: "place-office", name: "办公室", poiType: "office" },
      [
        {
          id: "event-office-1",
          placeId: "place-office",
          startTime: "2026-05-03T10:00:00+08:00",
          tags: ["work"],
          mediaCount: 2,
          steps: 300
        },
        {
          id: "event-office-2",
          placeId: "place-office",
          startTime: "2026-05-04T10:00:00+08:00",
          tags: ["work"],
          mediaCount: 1,
          steps: 200
        }
      ]
    );

    const opportunities = generateOpportunities([recoveryProfile, officeProfile], events);

    expect(opportunities.map((opportunity) => opportunity.type)).toContain("recovery");
    expect(opportunities.map((opportunity) => opportunity.type)).toContain("memory");
    expect(opportunities.map((opportunity) => opportunity.type)).toContain("work");
    expect(opportunities[0].suggestedTask).toBeTruthy();
    expect(opportunities[0].layer3Expression?.visualHint).toBeTruthy();
  });
});
