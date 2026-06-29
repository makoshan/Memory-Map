export type PlaceRole =
  | "home"
  | "work"
  | "memory"
  | "finance"
  | "life"
  | "recovery"
  | "unknown";

export type EventTag = "work" | "social" | "exercise" | "travel" | "finance" | "life";

export type PoiType =
  | "park"
  | "office"
  | "mall"
  | "home"
  | "school"
  | "restaurant"
  | "other";

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  poiType: PoiType;
  admin: {
    city?: string;
    district?: string;
  };
  env?: {
    humidity?: number;
    temp?: number;
    aqi?: number;
    noiseEstimate?: number;
  };
};

export type Trace = {
  timestamp: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
};

export type EventRecord = {
  id: string;
  placeId: string;
  startTime: string;
  endTime?: string;
  tags: EventTag[];
  steps?: number;
  mediaCount?: number;
  amount?: number;
  intensity?: number;
  valence?: number;
};

export type MediaAsset = {
  id: string;
  type: "image" | "note" | "audio";
  source: "file_import" | "drag_drop" | "share_sheet" | "camera" | "recorder" | "manual";
  filePath?: string;
  fileName?: string;
  text?: string;
  transcript?: string;
  capturedAt?: string;
  importedAt: string;
  placeHint?: {
    lat?: number;
    lng?: number;
    placeId?: string;
  };
  eventId?: string;
  analysisStatus: "pending" | "analyzed" | "failed";
};

export type ReviewState = "draft" | "suggested" | "confirmed" | "rejected" | "superseded";

export type DayPart = "morning" | "afternoon" | "evening" | "night" | "mixed";

export type PlaceAffordance =
  | "work"
  | "memory"
  | "finance"
  | "recovery"
  | "relationship"
  | "route"
  | "project"
  | "avoid"
  | "record";

export type PlaceTimePattern = {
  dominantPartOfDay: DayPart;
  visitHours: number[];
  weekdayBias: "weekday" | "weekend" | "mixed";
};

export type PlaceEmotionPattern = {
  averageValence: number;
  averageIntensity: number;
  label: "positive" | "neutral" | "strained";
};

export type PlaceSocialPattern = {
  socialEventCount: number;
  relationshipHint: "none" | "light" | "recurring";
};

export type PlacePrediction = {
  ifNearby: string;
  bestNextActions: string[];
  avoidWhen: string[];
  revisitWhen: string[];
};

export type PlaceProfile = {
  placeId: string;
  placeName: string;
  role: PlaceRole;
  visitCount: number;
  dwellTimeMinutes: number;
  mediaCount: number;
  steps: number;
  score: number;
  memoryWeight: number;
  financeWeight: number;
  recovery: number;
  dampPenalty: number;
  heatLoad: number;
  overloadRisk: number;
  envProfile: {
    humidityAvg?: number;
    tempAvg?: number;
    aqiAvg?: number;
  };
  stateSummary: string;
  timePattern: PlaceTimePattern;
  emotionPattern: PlaceEmotionPattern;
  socialPattern: PlaceSocialPattern;
  activityAffordances: PlaceAffordance[];
  riskPriors: string[];
  opportunityPriors: string[];
  prediction: PlacePrediction;
  confidence: number;
  reviewState: ReviewState;
  profileVersion: number;
  lastReflectedAt?: string;
};

export type WorldNode = {
  id: string;
  placeId: string;
  nodeType: string;
  layer1Source: string;
  size: number;
  brightness: number;
  vegetationDensity: number;
  waterLevel: number;
  fogDensity: number;
  buildingStyle: string;
  unlockedRooms: string[];
  unlockLevel: number;
  unlockReason: string;
  lastGeneratedAt: string;
};

export type GameUnlock = {
  id: string;
  placeId: string;
  unlockType: "node" | "building" | "room" | "object" | "task" | "atmosphere";
  unlockKey: string;
  sourceMetric: string;
  threshold: number;
  unlockedAt: string;
  visibleInLayer3: boolean;
};

export type OpportunityType =
  | "work"
  | "finance"
  | "memory"
  | "life"
  | "recovery"
  | "relationship"
  | "route"
  | "project";

export type OpportunityPolicyType =
  | "do"
  | "avoid"
  | "revisit"
  | "rest"
  | "record"
  | "route"
  | "project";

export type ExpectedWorldDelta = {
  nodeId?: string;
  brightnessDelta?: number;
  vegetationDelta?: number;
  fogDelta?: number;
  unlockKey?: string;
  explanation: string;
};

export type OpportunityFeedbackSummary = {
  acceptedCount: number;
  dismissedCount: number;
  completedCount: number;
};

export type Opportunity = {
  id: string;
  type: OpportunityType;
  title: string;
  summary: string;
  source: {
    placeIds: string[];
    eventIds?: string[];
    profileIds?: string[];
  };
  evidence: string[];
  expectedImpact: "low" | "medium" | "high";
  horizon: "today" | "week" | "month" | "long_term";
  urgency: number;
  confidence: number;
  suggestedTask: string;
  layer3Expression?: {
    nodeId?: string;
    unlockKey?: string;
    visualHint?: string;
  };
  status: "new" | "accepted" | "dismissed" | "done" | "expired";
  policyType: OpportunityPolicyType;
  hypothesis: string;
  expectedWorldDelta: ExpectedWorldDelta;
  sourceProfileVersion: number;
  feedbackSummary: OpportunityFeedbackSummary;
};

export type OpportunityAction = {
  id: string;
  opportunityId: string;
  actionType: "accept" | "dismiss" | "complete";
  taskId?: string;
  feedback?: string;
  createdAt: string;
};

export type FeedbackTargetType =
  | "event_meaning"
  | "place_profile"
  | "opportunity"
  | "reflection"
  | "skill"
  | "world_node"
  | "model_claim";

export type FeedbackAction =
  | "confirm"
  | "correct"
  | "dismiss"
  | "merge"
  | "split"
  | "accept"
  | "complete"
  | "snooze"
  | "tune";

export type FeedbackEvent = {
  id: string;
  targetType: FeedbackTargetType;
  targetId: string;
  action: FeedbackAction;
  userNote?: string;
  beforeJson?: string;
  afterJson?: string;
  createdAt: string;
};

export type Reflection = {
  id: string;
  scope: "place" | "project" | "user" | "agent" | "skill";
  sourceEventIds: string[];
  sourceFeedbackIds: string[];
  summary: string;
  confidence: number;
  status: ReviewState;
  createdAt: string;
};

export type Skill = {
  id: string;
  title: string;
  trigger: string;
  procedure: string;
  sourceReflectionIds: string[];
  successCount: number;
  failureCount: number;
  status: "draft" | "active" | "paused" | "retired";
  createdAt: string;
  updatedAt: string;
};

export type ModelClaim = {
  id: string;
  targetType: "event_meaning" | "place_profile" | "opportunity" | "world_node";
  targetId: string;
  claimType: "role" | "risk" | "opportunity" | "memory" | "world_delta";
  claimText: string;
  evidenceRefs: string[];
  confidence: number;
  reviewState: ReviewState;
  createdAt: string;
  updatedAt: string;
};

export type WorkbenchArtifact = {
  id: string;
  artifactType: "place_inspector" | "opportunity_board" | "memory_review" | "skill_workshop" | "world_sync_preview";
  title: string;
  targetType: "place_profile" | "opportunity" | "reflection" | "skill" | "world_state";
  targetId: string;
  summary: string;
  modelClaimIds: string[];
  feedbackEventIds: string[];
  status: "draft" | "ready" | "reviewed" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type HermesAnalysisJob = {
  id: string;
  mediaAssetId?: string;
  eventId?: string;
  jobType: "media-analysis" | "event-draft" | "opportunity-draft" | "world-explanation";
  inputSummary: string;
  outputJson?: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  error?: string;
};

export type AgentContextSnapshot = {
  id: string;
  userId: string;
  createdAt: string;
  timeRange: string;
  eventSummary: string;
  mediaAssetSummary: string;
  placeProfileDiff: string;
  activeRisks: string[];
  activeOpportunities: string[];
  todayTasks: string[];
  layer3Changes: string;
  sentToHermes: boolean;
};
