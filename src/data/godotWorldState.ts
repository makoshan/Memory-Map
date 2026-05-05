import { agentContext, aiSuggestion, profiles, timelineStages, unlocks, worldNodes } from "./sampleData";
import { createGodotWorldState } from "../integrations/godotWorldState";

export const godotWorldState = createGodotWorldState({
  generatedAt: "2026-05-04T10:00:00+08:00",
  userId: "alex",
  displayName: "Alex Chen",
  day: 10532,
  level: 42,
  profiles,
  worldNodes,
  unlocks,
  agentContext,
  aiSuggestion,
  timeline: timelineStages
});
