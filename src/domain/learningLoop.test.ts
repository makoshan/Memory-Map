import { describe, expect, it } from "vitest";
import { buildPlaceProfile, generateOpportunities } from "./worldEngine";
import {
  createFeedbackEvent,
  createModelClaimForPlaceProfile,
  createPlaceInspectorArtifact,
  createReflectionFromFeedback,
  createSkillFromReflection
} from "./learningLoop";
import type { EventRecord, Place } from "./types";

const place: Place = {
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
  }
];

describe("learning loop", () => {
  it("records human feedback as a first-class learning signal", () => {
    const feedback = createFeedbackEvent({
      targetType: "place_profile",
      targetId: "place-xixi",
      action: "confirm",
      userNote: "这里确实是恢复点",
      now: "2026-05-10T10:00:00+08:00"
    });

    expect(feedback.id).toBe("feedback-place_profile-place-xixi-confirm-20260510100000");
    expect(feedback.action).toBe("confirm");
    expect(feedback.userNote).toContain("恢复点");
  });

  it("turns place beliefs into model claims and GUI office artifacts", () => {
    const profile = buildPlaceProfile(place, events);
    const claim = createModelClaimForPlaceProfile(profile, "2026-05-10T10:00:00+08:00");
    const artifact = createPlaceInspectorArtifact({
      profile,
      claims: [claim],
      feedbackEvents: [],
      now: "2026-05-10T10:00:00+08:00"
    });

    expect(claim.claimText).toContain("西溪湿地");
    expect(claim.evidenceRefs).toContain("place_profile:place-xixi");
    expect(artifact.artifactType).toBe("place_inspector");
    expect(artifact.modelClaimIds).toEqual([claim.id]);
    expect(artifact.summary).toContain("可检查");
  });

  it("creates approved reflections and draft skills from feedback", () => {
    const feedback = createFeedbackEvent({
      targetType: "opportunity",
      targetId: "opportunity-place-xixi-recovery",
      action: "complete",
      userNote: "完成后状态更好",
      now: "2026-05-10T10:00:00+08:00"
    });
    const reflection = createReflectionFromFeedback({
      scope: "place",
      sourceEventIds: ["event-walk"],
      feedbackEvents: [feedback],
      summary: "西溪湿地的低负荷散步对恢复有效。",
      confidence: 0.82,
      now: "2026-05-10T10:05:00+08:00"
    });
    const skill = createSkillFromReflection({
      reflection,
      title: "西溪湿地恢复散步",
      trigger: "当西溪湿地恢复机会出现且当天负荷不高",
      procedure: "建议 20 分钟低负荷散步，并在完成后记录一条恢复事件。",
      now: "2026-05-10T10:10:00+08:00"
    });

    expect(reflection.status).toBe("confirmed");
    expect(reflection.sourceFeedbackIds).toEqual([feedback.id]);
    expect(skill.status).toBe("draft");
    expect(skill.sourceReflectionIds).toEqual([reflection.id]);
  });

  it("keeps opportunities usable as policy outputs after learning records exist", () => {
    const profile = buildPlaceProfile(place, events);
    const opportunities = generateOpportunities([profile], events);

    expect(opportunities[0].policyType).toBe("rest");
    expect(opportunities[0].expectedWorldDelta.explanation).toContain("生活区");
  });
});
