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
};

export type OpportunityAction = {
  id: string;
  opportunityId: string;
  actionType: "accept" | "dismiss" | "complete";
  taskId?: string;
  feedback?: string;
  createdAt: string;
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
