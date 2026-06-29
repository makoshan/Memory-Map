import type {
  FeedbackAction,
  FeedbackEvent,
  FeedbackTargetType,
  ModelClaim,
  PlaceProfile,
  Reflection,
  Skill,
  WorkbenchArtifact
} from "./types";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const timestampId = (value: string) => value.replace(/[^0-9]/g, "").slice(0, 14);

export function createFeedbackEvent(input: {
  targetType: FeedbackTargetType;
  targetId: string;
  action: FeedbackAction;
  userNote?: string;
  beforeJson?: string;
  afterJson?: string;
  now?: string;
}): FeedbackEvent {
  const createdAt = input.now ?? new Date().toISOString();

  return {
    id: `feedback-${input.targetType}-${input.targetId}-${input.action}-${timestampId(createdAt)}`,
    targetType: input.targetType,
    targetId: input.targetId,
    action: input.action,
    userNote: input.userNote,
    beforeJson: input.beforeJson,
    afterJson: input.afterJson,
    createdAt
  };
}

export function createModelClaimForPlaceProfile(profile: PlaceProfile, now = new Date().toISOString()): ModelClaim {
  return {
    id: `claim-place-profile-${profile.placeId}-${timestampId(now)}`,
    targetType: "place_profile",
    targetId: profile.placeId,
    claimType: profile.overloadRisk >= 0.7 ? "risk" : profile.mediaCount >= 3 ? "memory" : "opportunity",
    claimText: `${profile.placeName} 当前被模型判断为 ${profile.role}，${profile.stateSummary}`,
    evidenceRefs: [
      `place_profile:${profile.placeId}`,
      `visit_count:${profile.visitCount}`,
      `media_count:${profile.mediaCount}`,
      `profile_version:${profile.profileVersion}`
    ],
    confidence: profile.confidence,
    reviewState: profile.reviewState,
    createdAt: now,
    updatedAt: now
  };
}

export function createPlaceInspectorArtifact(input: {
  profile: PlaceProfile;
  claims: ModelClaim[];
  feedbackEvents: FeedbackEvent[];
  now?: string;
}): WorkbenchArtifact {
  const createdAt = input.now ?? new Date().toISOString();

  return {
    id: `workbench-place-inspector-${input.profile.placeId}-${timestampId(createdAt)}`,
    artifactType: "place_inspector",
    title: `${input.profile.placeName} 地点检查台`,
    targetType: "place_profile",
    targetId: input.profile.placeId,
    summary: `${input.profile.placeName} 的地点状态可检查、可修正、可批准。`,
    modelClaimIds: input.claims.map((claim) => claim.id),
    feedbackEventIds: input.feedbackEvents.map((feedback) => feedback.id),
    status: "ready",
    createdAt,
    updatedAt: createdAt
  };
}

export function createReflectionFromFeedback(input: {
  scope: Reflection["scope"];
  sourceEventIds: string[];
  feedbackEvents: FeedbackEvent[];
  summary: string;
  confidence: number;
  now?: string;
}): Reflection {
  const createdAt = input.now ?? new Date().toISOString();

  return {
    id: `reflection-${input.scope}-${timestampId(createdAt)}`,
    scope: input.scope,
    sourceEventIds: input.sourceEventIds,
    sourceFeedbackIds: input.feedbackEvents.map((feedback) => feedback.id),
    summary: input.summary,
    confidence: Number(clamp01(input.confidence).toFixed(2)),
    status: "confirmed",
    createdAt
  };
}

export function createSkillFromReflection(input: {
  reflection: Reflection;
  title: string;
  trigger: string;
  procedure: string;
  now?: string;
}): Skill {
  const createdAt = input.now ?? new Date().toISOString();

  return {
    id: `skill-${input.reflection.id}`,
    title: input.title,
    trigger: input.trigger,
    procedure: input.procedure,
    sourceReflectionIds: [input.reflection.id],
    successCount: 0,
    failureCount: 0,
    status: "draft",
    createdAt,
    updatedAt: createdAt
  };
}
