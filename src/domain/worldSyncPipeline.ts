export type WorldSyncThresholds = {
  eventCount: number;
  visitCount: number;
  locationConfidence: number;
  hermesSuccessCount: number;
};

export type WorldSyncPipelineInput = {
  eventMeaningGenerated: boolean;
  samePlaceEventCount: number;
  distinctVisitCount: number;
  locationConfidence: number;
  hermesSuccessCount: number;
  worldExported: boolean;
  thresholds?: Partial<WorldSyncThresholds>;
};

export type WorldSyncEvidence = {
  placeKey: string;
  placeName?: string;
  capturedAt: string;
  locationConfidence: number;
  hermesSucceeded: boolean;
};

export type WorldSyncEvidenceSummaryInput = {
  stored: WorldSyncEvidence[];
  current?: WorldSyncEvidence;
  worldExported?: boolean;
};

export type GpsWorldSyncEvidenceInput = {
  longitude: number;
  latitude: number;
  capturedAt: string;
  hermesSucceeded: boolean;
};

export type WorldSyncPipelineStatus = {
  eventMeaning: string;
  placeProfile: string;
  layer3: string;
  godotWorldState: string;
  readyForPlaceProfile: boolean;
};

export const DEFAULT_WORLD_SYNC_THRESHOLDS: WorldSyncThresholds = {
  eventCount: 10,
  visitCount: 2,
  locationConfidence: 0.8,
  hermesSuccessCount: 2
};

function resolvedThresholds(input?: Partial<WorldSyncThresholds>): WorldSyncThresholds {
  return { ...DEFAULT_WORLD_SYNC_THRESHOLDS, ...input };
}

function remaining(required: number, current: number) {
  return Math.max(0, required - current);
}

export function createGpsWorldSyncEvidence(input: GpsWorldSyncEvidenceInput): WorldSyncEvidence {
  const longitude = input.longitude.toFixed(4);
  const latitude = input.latitude.toFixed(4);
  return {
    placeKey: `gps:${longitude},${latitude}`,
    placeName: `GPS ${longitude}, ${latitude}`,
    capturedAt: input.capturedAt,
    locationConfidence: 1,
    hermesSucceeded: input.hermesSucceeded
  };
}

function visitBucket(capturedAt: string) {
  const time = new Date(capturedAt).getTime();
  if (!Number.isFinite(time)) return capturedAt;
  return Math.floor(time / (60 * 60 * 1000));
}

function uniqueEvidence(records: WorldSyncEvidence[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.placeKey}|${record.capturedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function summarizeWorldSyncEvidence(input: WorldSyncEvidenceSummaryInput): WorldSyncPipelineInput {
  const targetPlaceKey = input.current?.placeKey ?? input.stored[0]?.placeKey;
  if (!targetPlaceKey) {
    return {
      eventMeaningGenerated: false,
      samePlaceEventCount: 0,
      distinctVisitCount: 0,
      locationConfidence: 0,
      hermesSuccessCount: 0,
      worldExported: input.worldExported ?? false
    };
  }

  const records = uniqueEvidence([
    ...input.stored,
    ...(input.current ? [input.current] : [])
  ].filter((record) => record.placeKey === targetPlaceKey));

  return {
    eventMeaningGenerated: records.length > 0,
    samePlaceEventCount: records.length,
    distinctVisitCount: new Set(records.map((record) => visitBucket(record.capturedAt))).size,
    locationConfidence: records.reduce((max, record) => Math.max(max, record.locationConfidence), 0),
    hermesSuccessCount: records.filter((record) => record.hermesSucceeded).length,
    worldExported: input.worldExported ?? false
  };
}

export function evaluateWorldSyncPipeline(input: WorldSyncPipelineInput): WorldSyncPipelineStatus {
  const thresholds = resolvedThresholds(input.thresholds);
  if (!input.eventMeaningGenerated) {
    return {
      eventMeaning: "未同步",
      placeProfile: "未同步",
      layer3: "未同步",
      godotWorldState: "未导出",
      readyForPlaceProfile: false
    };
  }

  const evidenceCount = Math.max(1, input.samePlaceEventCount);
  const enoughEvents = evidenceCount >= thresholds.eventCount;
  const enoughVisits = input.distinctVisitCount >= thresholds.visitCount;
  const confidentLocation = input.locationConfidence >= thresholds.locationConfidence;
  const enoughHermes = input.hermesSuccessCount >= thresholds.hermesSuccessCount;
  const readyForPlaceProfile = enoughEvents && enoughVisits && confidentLocation && enoughHermes;

  let placeProfile = "地点画像稳定，等待生成世界区域";
  if (!enoughEvents) {
    placeProfile = `证据不足，同地点还需 ${remaining(thresholds.eventCount, evidenceCount)} 张`;
  } else if (!enoughVisits) {
    placeProfile = `证据不足，还需 ${remaining(thresholds.visitCount, input.distinctVisitCount)} 次不同时间访问`;
  } else if (!confidentLocation) {
    placeProfile = "证据不足，地址/GPS 置信度需达到 0.8";
  } else if (!enoughHermes) {
    placeProfile = `证据不足，Hermes 成功还需 ${remaining(thresholds.hermesSuccessCount, input.hermesSuccessCount)} 条`;
  }

  return {
    eventMeaning: readyForPlaceProfile
      ? `已生成 ${evidenceCount} / ${thresholds.eventCount}，可聚合为地点画像`
      : `已生成 ${evidenceCount} / ${thresholds.eventCount}，等待更多图片`,
    placeProfile,
    layer3: readyForPlaceProfile ? "地点画像稳定，准备生成世界建筑/区域" : "等待地点画像稳定",
    godotWorldState: input.worldExported ? "已导出稳定世界状态" : readyForPlaceProfile ? "等待导出稳定世界状态" : "未导出",
    readyForPlaceProfile
  };
}
