import { createGodotWorldState, type GodotWorldState } from "../integrations/godotWorldState";
import type { EventMeaning } from "./eventMeaning";
import {
  buildAgentContext,
  buildPlaceProfile,
  generateOpportunities,
  generateUnlocks,
  generateWorldNode
} from "./worldEngine";
import type {
  AgentContextSnapshot,
  EventRecord,
  EventTag,
  FeedbackEvent,
  GameUnlock,
  MediaAsset,
  Opportunity,
  Place,
  PlaceProfile,
  Reflection,
  Skill,
  WorkbenchArtifact,
  WorldNode
} from "./types";

export type AiSuggestion = {
  conclusion: string;
  suggestion: string;
  risk: string;
};

export type EventDraft = {
  placeId: string;
  tags: EventTag[];
  startTime: string;
  endTime?: string;
  steps?: number;
  mediaCount?: number;
  amount?: number;
  intensity?: number;
  valence?: number;
};

export type MediaAssetDraft = {
  type: MediaAsset["type"];
  source: MediaAsset["source"];
  filePath?: string;
  fileName?: string;
  text?: string;
  transcript?: string;
  capturedAt?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

export function createMediaAssetRecord(draft: MediaAssetDraft, importedAt = new Date().toISOString()): MediaAsset {
  const safeTime = importedAt.replace(/[^0-9]/g, "").slice(0, 14);
  const safeName = (draft.fileName ?? draft.type).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id: `media-${draft.type}-${safeTime}-${safeName || "asset"}`,
    type: draft.type,
    source: draft.source,
    filePath: draft.filePath,
    fileName: draft.fileName,
    text: draft.text,
    transcript: draft.transcript,
    capturedAt: draft.capturedAt,
    importedAt,
    placeHint: draft.placeId || draft.lat !== undefined || draft.lng !== undefined
      ? {
          placeId: draft.placeId,
          lat: draft.lat,
          lng: draft.lng
        }
      : undefined,
    analysisStatus: "pending"
  };
}

export function createEventDraftFromMediaAsset(
  asset: MediaAsset,
  fallbackPlaceId: string,
  tag: EventTag = "life"
): EventDraft {
  const startTime = asset.capturedAt ?? asset.importedAt;

  return {
    placeId: asset.placeHint?.placeId ?? fallbackPlaceId,
    tags: [tag],
    startTime,
    endTime: startTime,
    mediaCount: 1,
    intensity: asset.type === "audio" ? 0.55 : 0.45,
    valence: 0.45
  };
}

export type WorldSnapshot = {
  events: EventRecord[];
  eventMeanings: EventMeaning[];
  profiles: PlaceProfile[];
  worldNodes: WorldNode[];
  unlocks: GameUnlock[];
  opportunities: Opportunity[];
  agentContext: AgentContextSnapshot;
  aiSuggestion: AiSuggestion;
  godotWorldState: GodotWorldState;
  feedbackEvents: FeedbackEvent[];
  reflections: Reflection[];
  skills: Skill[];
  workbenchArtifacts: WorkbenchArtifact[];
};

export function appendEventRecord(events: EventRecord[], draft: EventDraft): EventRecord[] {
  const safeTime = draft.startTime.replace(/[^0-9]/g, "").slice(0, 14);
  const suffix = events.filter((event) => event.placeId === draft.placeId).length + 1;

  return [
    ...events,
    {
      id: `event-${draft.placeId}-${safeTime}-${suffix}`,
      placeId: draft.placeId,
      startTime: draft.startTime,
      endTime: draft.endTime,
      tags: draft.tags,
      steps: draft.steps,
      mediaCount: draft.mediaCount,
      amount: draft.amount,
      intensity: draft.intensity,
      valence: draft.valence
    }
  ];
}

export function createAiSuggestion(input: {
  agentContext: AgentContextSnapshot;
  profiles: PlaceProfile[];
}): AiSuggestion {
  const topProfile = [...input.profiles].sort((a, b) => b.score - a.score)[0];
  const riskProfile = [...input.profiles].sort((a, b) => b.overloadRisk - a.overloadRisk)[0];
  const recoveryProfile = [...input.profiles].sort((a, b) => b.recovery - a.recovery)[0];

  if (!topProfile) {
    return {
      conclusion: "今天还没有足够事件形成地点画像。",
      suggestion: "先记录一条位置、任务或照片事件。",
      risk: "数据不足，暂不判断风险。"
    };
  }

  const needsRest = riskProfile && riskProfile.overloadRisk > 0.55;

  return {
    conclusion: `${topProfile.placeName} 现在是主导节点，${topProfile.role} 权重最高，世界等级 Lv.${Math.ceil(topProfile.score)}。`,
    suggestion: needsRest
      ? `把下一步任务放在 ${riskProfile.placeName} 的低负荷房间，完成后记录一条恢复事件。`
      : `优先推进 ${topProfile.placeName} 的一个关键任务，再补充一条事件记录。`,
    risk: needsRest
      ? `${riskProfile.placeName} 的负荷风险 ${Math.round(riskProfile.overloadRisk * 100)}%，注意减少连续移动。`
      : `${recoveryProfile?.placeName ?? topProfile.placeName} 恢复状态较好，当前风险较低。`
  };
}

export function createWorldSnapshot(input: {
  places: Place[];
  events: EventRecord[];
  mediaAssets?: MediaAsset[];
  eventMeanings?: EventMeaning[];
  userId: string;
  timeline: Array<{ year: string; title: string; note: string }>;
  generatedAt?: string;
  feedbackEvents?: FeedbackEvent[];
  reflections?: Reflection[];
  skills?: Skill[];
  workbenchArtifacts?: WorkbenchArtifact[];
}): WorldSnapshot {
  const profiles = input.places.map((place) => buildPlaceProfile(place, input.events));
  const worldNodes = profiles.map((profile) => generateWorldNode(profile, input.generatedAt));
  const unlocks = profiles.flatMap((profile) => generateUnlocks(profile, input.generatedAt));
  const opportunities = generateOpportunities(profiles, input.events);
  const agentContext = buildAgentContext({
    userId: input.userId,
    events: input.events,
    profiles,
    worldNodes,
    mediaAssets: input.mediaAssets,
    opportunities
  });
  const aiSuggestion = createAiSuggestion({ agentContext, profiles });
  const godotWorldState = createGodotWorldState({
    generatedAt: input.generatedAt,
    userId: input.userId,
    displayName: "Alex Chen",
    day: 10532,
    level: 42,
    profiles,
    worldNodes,
    unlocks,
    agentContext,
    aiSuggestion,
    timeline: input.timeline
  });

  return {
    events: input.events,
    eventMeanings: input.eventMeanings ?? [],
    profiles,
    worldNodes,
    unlocks,
    opportunities,
    agentContext,
    aiSuggestion,
    godotWorldState,
    feedbackEvents: input.feedbackEvents ?? [],
    reflections: input.reflections ?? [],
    skills: input.skills ?? [],
    workbenchArtifacts: input.workbenchArtifacts ?? []
  };
}
