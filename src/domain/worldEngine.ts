import type {
  AgentContextSnapshot,
  EventRecord,
  GameUnlock,
  MediaAsset,
  Opportunity,
  Place,
  PlaceProfile,
  PlaceRole,
  WorldNode
} from "./types";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const minutesBetween = (start: string, end?: string) => {
  if (!end) return 30;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff / 60000) : 30;
};

const countTags = (events: EventRecord[]) =>
  events.reduce<Record<string, number>>((acc, event) => {
    for (const tag of event.tags) {
      acc[tag] = (acc[tag] ?? 0) + 1;
    }
    return acc;
  }, {});

const hourFromStartTime = (startTime: string) => {
  const localHour = /T(\d{2}):/.exec(startTime)?.[1];
  return localHour ? Number(localHour) : new Date(startTime).getHours();
};

const dayPartForHour = (hour: number) => {
  if (hour >= 5 && hour < 12) return "morning" as const;
  if (hour >= 12 && hour < 18) return "afternoon" as const;
  if (hour >= 18 && hour < 23) return "evening" as const;
  return "night" as const;
};

const dominant = <T extends string>(items: T[], fallback: T): T => {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as T | undefined) ?? fallback;
};

const buildTimePattern = (events: EventRecord[]) => {
  const hours = events.map((event) => hourFromStartTime(event.startTime)).filter((hour) => Number.isFinite(hour));
  const dayParts = hours.map(dayPartForHour);
  const weekendCount = events.filter((event) => {
    const day = new Date(event.startTime).getDay();
    return day === 0 || day === 6;
  }).length;
  const weekdayCount = events.length - weekendCount;

  return {
    dominantPartOfDay: events.length === 0 ? "mixed" as const : dominant(dayParts, "mixed"),
    visitHours: Array.from(new Set(hours)).sort((a, b) => a - b),
    weekdayBias:
      weekdayCount === weekendCount
        ? "mixed" as const
        : weekdayCount > weekendCount
        ? "weekday" as const
        : "weekend" as const
  };
};

const buildEmotionPattern = (events: EventRecord[]) => {
  const valences = events.map((event) => event.valence).filter((value): value is number => value !== undefined);
  const intensities = events.map((event) => event.intensity).filter((value): value is number => value !== undefined);
  const averageValence = valences.length
    ? valences.reduce((sum, value) => sum + value, 0) / valences.length
    : 0;
  const averageIntensity = intensities.length
    ? intensities.reduce((sum, value) => sum + value, 0) / intensities.length
    : 0;

  return {
    averageValence: Number(averageValence.toFixed(2)),
    averageIntensity: Number(averageIntensity.toFixed(2)),
    label: averageValence >= 0.35 ? "positive" as const : averageValence <= -0.2 ? "strained" as const : "neutral" as const
  };
};

const buildSocialPattern = (events: EventRecord[]) => {
  const socialEventCount = events.filter((event) => event.tags.includes("social")).length;
  return {
    socialEventCount,
    relationshipHint: socialEventCount >= 3 ? "recurring" as const : socialEventCount > 0 ? "light" as const : "none" as const
  };
};

const inferRole = (place: Place, events: EventRecord[]): PlaceRole => {
  const tagCounts = countTags(events);
  if (place.poiType === "home") return "home";
  if ((tagCounts.work ?? 0) >= 2 || place.poiType === "office") return "work";
  if ((tagCounts.finance ?? 0) >= 2 || place.poiType === "mall") return "finance";
  if ((tagCounts.exercise ?? 0) > 0 || place.poiType === "park") return "life";
  if (events.reduce((sum, event) => sum + (event.mediaCount ?? 0), 0) >= 6) return "memory";
  return "unknown";
};

export function buildPlaceProfile(place: Place, allEvents: EventRecord[]): PlaceProfile {
  const events = allEvents.filter((event) => event.placeId === place.id);
  const visitCount = events.length;
  const dwellTimeMinutes = events.reduce(
    (sum, event) => sum + minutesBetween(event.startTime, event.endTime),
    0
  );
  const mediaCount = events.reduce((sum, event) => sum + (event.mediaCount ?? 0), 0);
  const steps = events.reduce((sum, event) => sum + (event.steps ?? 0), 0);
  const financeTotal = events.reduce((sum, event) => sum + Math.abs(event.amount ?? 0), 0);
  const humidity = place.env?.humidity;
  const temp = place.env?.temp;
  const aqi = place.env?.aqi;

  const memoryWeight = clamp(Math.log1p(mediaCount) / 3);
  const financeWeight = clamp(Math.log1p(financeTotal) / 8);
  const recovery = clamp(steps / 12000 + (aqi !== undefined && aqi <= 50 ? 0.18 : 0));
  const dampPenalty = humidity !== undefined && humidity > 78 ? clamp((humidity - 78) / 25) : 0;
  const heatLoad = temp !== undefined && temp > 30 ? clamp((temp - 30) / 12) : 0;
  const overloadRisk = clamp(visitCount / 8 + heatLoad * 0.4 + dampPenalty * 0.25);
  const role = inferRole(place, events);
  const timePattern = buildTimePattern(events);
  const emotionPattern = buildEmotionPattern(events);
  const socialPattern = buildSocialPattern(events);
  const activityAffordances = Array.from(new Set([
    ...(recovery >= 0.6 ? ["recovery" as const] : []),
    ...(mediaCount >= 3 ? ["memory" as const, "record" as const] : []),
    ...(financeWeight >= 0.35 ? ["finance" as const] : []),
    ...(role === "work" ? ["work" as const, "project" as const] : []),
    ...(socialPattern.socialEventCount > 0 ? ["relationship" as const] : []),
    ...(overloadRisk >= 0.7 ? ["avoid" as const] : [])
  ]));
  const riskPriors = [
    ...(dampPenalty > 0 ? ["湿度偏高时容易形成疲劳或低亮度世界状态"] : []),
    ...(heatLoad > 0 ? ["高温时适合降低移动和任务强度"] : []),
    ...(overloadRisk >= 0.55 ? ["近期事件密度偏高，适合减少连续外出"] : [])
  ];
  const opportunityPriors = [
    ...(recovery >= 0.6 ? ["适合作为恢复或低负荷行动节点"] : []),
    ...(mediaCount >= 3 ? ["适合整理记忆材料并生成记忆物件"] : []),
    ...(financeWeight >= 0.35 ? ["适合做轻量收入或支出复盘"] : [])
  ];
  const prediction = {
    ifNearby: `${place.name} 附近可能触发 ${activityAffordances.length ? activityAffordances.join("、") : "记录"} 行动。`,
    bestNextActions: opportunityPriors.length ? opportunityPriors : ["记录一次新的地点事件，继续收集证据"],
    avoidWhen: riskPriors.length ? riskPriors : ["证据不足时避免生成强任务"],
    revisitWhen: [`${timePattern.dominantPartOfDay === "mixed" ? "证据更稳定时" : timePattern.dominantPartOfDay} 重访更符合历史节奏`]
  };
  const confidence = clamp(0.35 + Math.min(visitCount, 6) * 0.07 + Math.min(mediaCount, 8) * 0.035);
  const score =
    Math.log1p(visitCount) * 0.9 +
    Math.log1p(dwellTimeMinutes / 45) * 0.45 +
    memoryWeight +
    financeWeight * 0.55 +
    recovery * 0.6 -
    dampPenalty * 0.15;

  return {
    placeId: place.id,
    placeName: place.name,
    role,
    visitCount,
    dwellTimeMinutes,
    mediaCount,
    steps,
    score: Number(Math.max(0, score).toFixed(2)),
    memoryWeight: Number(memoryWeight.toFixed(2)),
    financeWeight: Number(financeWeight.toFixed(2)),
    recovery: Number(recovery.toFixed(2)),
    dampPenalty: Number(dampPenalty.toFixed(2)),
    heatLoad: Number(heatLoad.toFixed(2)),
    overloadRisk: Number(overloadRisk.toFixed(2)),
    envProfile: {
      humidityAvg: humidity,
      tempAvg: temp,
      aqiAvg: aqi
    },
    stateSummary: `${place.name} 当前是 ${role} 倾向地点，承载 ${visitCount} 次访问、${mediaCount} 条媒体证据和 ${steps} 步行动信号。`,
    timePattern,
    emotionPattern,
    socialPattern,
    activityAffordances,
    riskPriors,
    opportunityPriors,
    prediction,
    confidence: Number(confidence.toFixed(2)),
    reviewState: "suggested",
    profileVersion: 1,
    lastReflectedAt: undefined
  };
}

const roomForRole = (role: PlaceRole) => {
  switch (role) {
    case "home":
      return "家";
    case "work":
      return "办公室";
    case "memory":
      return "记忆馆";
    case "finance":
      return "财务楼";
    case "life":
    case "recovery":
      return "生活区";
    default:
      return "未命名节点";
  }
};

export function generateWorldNode(profile: PlaceProfile, now = new Date().toISOString()): WorldNode {
  const nodeType = roomForRole(profile.role);
  const unlockLevel = Math.max(1, Math.min(10, Math.ceil(profile.score)));
  const waterLevel = clamp(0.32 + profile.dampPenalty * 0.82);
  const fogDensity = clamp(profile.dampPenalty * 0.5 + profile.overloadRisk * 0.2);

  return {
    id: `world-${profile.placeId}`,
    placeId: profile.placeId,
    nodeType,
    layer1Source: "PlaceProfile",
    size: Number((1 + profile.score * 0.22).toFixed(2)),
    brightness: Number(clamp(0.58 + profile.recovery * 0.35 - profile.overloadRisk * 0.2).toFixed(2)),
    vegetationDensity: Number(clamp(0.35 + profile.recovery * 0.55).toFixed(2)),
    waterLevel: Number(waterLevel.toFixed(2)),
    fogDensity: Number(fogDensity.toFixed(2)),
    buildingStyle: profile.role === "work" ? "modern-office" : profile.role === "finance" ? "ledger-tower" : "wetland-pixel",
    unlockedRooms: Array.from(new Set([nodeType, ...(profile.mediaCount >= 3 ? ["记忆物件"] : [])])),
    unlockLevel,
    unlockReason: `visit_count=${profile.visitCount}; media_count=${profile.mediaCount}; steps=${profile.steps}`,
    lastGeneratedAt: now
  };
}

export function generateUnlocks(
  profile: PlaceProfile,
  now = new Date().toISOString()
): GameUnlock[] {
  const unlocks: GameUnlock[] = [
    {
      id: `unlock-${profile.placeId}-place-node`,
      placeId: profile.placeId,
      unlockType: "node",
      unlockKey: "place-node",
      sourceMetric: "PlaceProfile.created",
      threshold: 1,
      unlockedAt: now,
      visibleInLayer3: true
    }
  ];

  if (profile.visitCount >= 2) {
    unlocks.push({
      id: `unlock-${profile.placeId}-building-upgrade`,
      placeId: profile.placeId,
      unlockType: "building",
      unlockKey: "building-upgrade",
      sourceMetric: "visit_count",
      threshold: 2,
      unlockedAt: now,
      visibleInLayer3: true
    });
  }

  if (profile.mediaCount >= 3) {
    unlocks.push({
      id: `unlock-${profile.placeId}-memory-shelf`,
      placeId: profile.placeId,
      unlockType: "object",
      unlockKey: "memory-shelf",
      sourceMetric: "media_count",
      threshold: 3,
      unlockedAt: now,
      visibleInLayer3: true
    });
  }

  if (profile.recovery >= 0.6) {
    unlocks.push({
      id: `unlock-${profile.placeId}-recovery-garden`,
      placeId: profile.placeId,
      unlockType: "room",
      unlockKey: "recovery-garden",
      sourceMetric: "recovery",
      threshold: 0.6,
      unlockedAt: now,
      visibleInLayer3: true
    });
  }

  if (profile.overloadRisk >= 0.7) {
    unlocks.push({
      id: `unlock-${profile.placeId}-rest-task`,
      placeId: profile.placeId,
      unlockType: "task",
      unlockKey: "rest-task",
      sourceMetric: "overload_risk",
      threshold: 0.7,
      unlockedAt: now,
      visibleInLayer3: true
    });
  }

  return unlocks;
}

const baseFeedbackSummary = {
  acceptedCount: 0,
  dismissedCount: 0,
  completedCount: 0
};

const policyMetadata = (profile: PlaceProfile, input: {
  policyType: Opportunity["policyType"];
  hypothesis: string;
  expectedWorldDelta: Opportunity["expectedWorldDelta"];
}) => ({
  policyType: input.policyType,
  hypothesis: input.hypothesis,
  expectedWorldDelta: input.expectedWorldDelta,
  sourceProfileVersion: profile.profileVersion,
  feedbackSummary: { ...baseFeedbackSummary }
});

export function generateOpportunities(profiles: PlaceProfile[], events: EventRecord[]): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const eventCountByPlace = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.placeId] = (acc[event.placeId] ?? 0) + 1;
    return acc;
  }, {});

  for (const profile of profiles) {
    if (profile.recovery >= 0.6) {
      opportunities.push({
        id: `opportunity-${profile.placeId}-recovery`,
        type: "recovery",
        title: `${profile.placeName} 恢复机会`,
        summary: `${profile.placeName} 最近呈现较好的恢复条件，适合安排低负荷行动。`,
        source: {
          placeIds: [profile.placeId],
          profileIds: [profile.placeId]
        },
        evidence: [
          `recovery=${profile.recovery}`,
          `steps=${profile.steps}`,
          `aqi=${profile.envProfile.aqiAvg ?? "unknown"}`
        ],
        expectedImpact: "medium",
        horizon: "today",
        urgency: Number((0.72 + profile.recovery * 0.2).toFixed(2)),
        confidence: Number(Math.min(0.95, 0.55 + profile.recovery * 0.35).toFixed(2)),
        suggestedTask: `在 ${profile.placeName} 安排一次低负荷恢复或散步记录。`,
        layer3Expression: {
          nodeId: `world-${profile.placeId}`,
          visualHint: "提高植被密度和亮度",
          unlockKey: "recovery-garden"
        },
        status: "new",
        ...policyMetadata(profile, {
          policyType: "rest",
          hypothesis: `${profile.placeName} 的恢复状态和空气条件支持一次低负荷行动。`,
          expectedWorldDelta: {
            nodeId: `world-${profile.placeId}`,
            brightnessDelta: 0.08,
            vegetationDelta: 0.12,
            unlockKey: "recovery-garden",
            explanation: "完成恢复行动后，生活区亮度和植被可以轻微上升。"
          }
        })
      });
    }

    if (profile.mediaCount >= 3) {
      opportunities.push({
        id: `opportunity-${profile.placeId}-memory`,
        type: "memory",
        title: `${profile.placeName} 记忆整理`,
        summary: `${profile.placeName} 已积累足够媒体材料，适合整理成记忆节点。`,
        source: {
          placeIds: [profile.placeId],
          eventIds: events.filter((event) => event.placeId === profile.placeId).map((event) => event.id),
          profileIds: [profile.placeId]
        },
        evidence: [`media_count=${profile.mediaCount}`, `memory_weight=${profile.memoryWeight}`],
        expectedImpact: "medium",
        horizon: "week",
        urgency: Number((0.5 + profile.memoryWeight * 0.3).toFixed(2)),
        confidence: Number(Math.min(0.94, 0.52 + profile.memoryWeight * 0.35).toFixed(2)),
        suggestedTask: `整理 ${profile.placeName} 的一张照片、笔记或音频转写。`,
        layer3Expression: {
          nodeId: `world-${profile.placeId}`,
          visualHint: "生成记忆书架和时间胶片",
          unlockKey: "memory-shelf"
        },
        status: "new",
        ...policyMetadata(profile, {
          policyType: "record",
          hypothesis: `${profile.placeName} 已经有足够媒体证据，可以从地点状态转成记忆节点。`,
          expectedWorldDelta: {
            nodeId: `world-${profile.placeId}`,
            unlockKey: "memory-shelf",
            explanation: "整理记忆后，Godot 世界可以解锁记忆书架或时间胶片。"
          }
        })
      });
    }

    if (profile.role === "work" || (eventCountByPlace[profile.placeId] ?? 0) >= 2 && profile.score >= 1.5) {
      opportunities.push({
        id: `opportunity-${profile.placeId}-work`,
        type: "work",
        title: `${profile.placeName} 工作推进`,
        summary: `${profile.placeName} 与工作行为强相关，可以承接一个明确任务。`,
        source: {
          placeIds: [profile.placeId],
          eventIds: events.filter((event) => event.placeId === profile.placeId).map((event) => event.id),
          profileIds: [profile.placeId]
        },
        evidence: [`role=${profile.role}`, `visit_count=${profile.visitCount}`, `score=${profile.score}`],
        expectedImpact: "high",
        horizon: "today",
        urgency: Number(Math.min(0.9, 0.48 + profile.score / 10 + profile.visitCount / 20).toFixed(2)),
        confidence: Number(Math.min(0.92, 0.55 + profile.visitCount / 12).toFixed(2)),
        suggestedTask: `把一个关键任务放到 ${profile.placeName} 的办公室节点推进。`,
        layer3Expression: {
          nodeId: `world-${profile.placeId}`,
          visualHint: "升级任务桌和 AI 员工提示",
          unlockKey: "building-upgrade"
        },
        status: "new",
        ...policyMetadata(profile, {
          policyType: "do",
          hypothesis: `${profile.placeName} 的工作标签和访问频率支持承接一个明确任务。`,
          expectedWorldDelta: {
            nodeId: `world-${profile.placeId}`,
            brightnessDelta: 0.05,
            unlockKey: "building-upgrade",
            explanation: "完成任务后，办公室节点可以升级任务桌或 AI 员工提示。"
          }
        })
      });
    }

    if (profile.financeWeight >= 0.35) {
      opportunities.push({
        id: `opportunity-${profile.placeId}-finance`,
        type: "finance",
        title: `${profile.placeName} 财务复盘`,
        summary: `${profile.placeName} 已出现财务权重，适合做一次轻量复盘。`,
        source: {
          placeIds: [profile.placeId],
          eventIds: events.filter((event) => event.placeId === profile.placeId && event.amount !== undefined).map((event) => event.id),
          profileIds: [profile.placeId]
        },
        evidence: [`finance_weight=${profile.financeWeight}`],
        expectedImpact: "medium",
        horizon: "week",
        urgency: Number((0.42 + profile.financeWeight * 0.32).toFixed(2)),
        confidence: Number((0.5 + profile.financeWeight * 0.28).toFixed(2)),
        suggestedTask: `复盘 ${profile.placeName} 最近一笔收入或支出。`,
        layer3Expression: {
          nodeId: `world-${profile.placeId}`,
          visualHint: "点亮账本墙",
          unlockKey: "finance-review"
        },
        status: "new",
        ...policyMetadata(profile, {
          policyType: "do",
          hypothesis: `${profile.placeName} 的财务权重支持一次轻量复盘。`,
          expectedWorldDelta: {
            nodeId: `world-${profile.placeId}`,
            unlockKey: "finance-review",
            explanation: "完成复盘后，财务楼可以点亮账本墙。"
          }
        })
      });
    }
  }

  return opportunities.sort((a, b) => b.urgency - a.urgency);
}

export function buildAgentContext(input: {
  userId: string;
  events: EventRecord[];
  profiles: PlaceProfile[];
  worldNodes: WorldNode[];
  mediaAssets?: MediaAsset[];
  opportunities?: Opportunity[];
}): AgentContextSnapshot {
  const topProfile = [...input.profiles].sort((a, b) => b.score - a.score)[0];
  const topNode = input.worldNodes.find((node) => node.placeId === topProfile?.placeId);
  const activeRisks = input.profiles
    .filter((profile) => profile.dampPenalty > 0 || profile.overloadRisk > 0.55)
    .map((profile) => `${profile.placeName}: damp=${profile.dampPenalty}, overload=${profile.overloadRisk}`);

  return {
    id: `agent-context-${input.userId}`,
    userId: input.userId,
    createdAt: new Date().toISOString(),
    timeRange: "recent",
    eventSummary: `${input.events.length} events across ${input.profiles.length} semantic places`,
    mediaAssetSummary: `${input.mediaAssets?.length ?? 0} imported assets ready for semantic analysis`,
    placeProfileDiff: topProfile
      ? `${topProfile.placeName} is ${topProfile.role} score=${topProfile.score}`
      : "No active PlaceProfile",
    activeRisks,
    activeOpportunities: (input.opportunities ?? [])
      .slice(0, 3)
      .map((opportunity) => `${opportunity.title}: ${opportunity.suggestedTask}`),
    todayTasks:
      input.opportunities?.[0]
        ? [input.opportunities[0].suggestedTask]
        : topProfile?.overloadRisk && topProfile.overloadRisk > 0.55
        ? ["减少移动，把一个任务放在室内完成"]
        : ["完成一个关键任务，并记录一条新事件"],
    layer3Changes: topNode
      ? `${topNode.nodeType} unlocked level ${topNode.unlockLevel} from ${topNode.unlockReason}`
      : "Layer 3 has no visible changes",
    sentToHermes: false
  };
}
