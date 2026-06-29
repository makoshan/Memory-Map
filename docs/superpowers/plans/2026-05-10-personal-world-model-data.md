# Personal World Model Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add the data structures and pure-domain logic needed for Memory Map's Personal World Model, feedback loop, and GUI Office workbench without changing the current Godot rendering contract.

**Architecture:** Extend the existing TypeScript domain model first, then derive predictive `PlaceProfile` state, policy-style `Opportunity` metadata, and feedback/reflection/skill records through pure functions. Keep production persistence unchanged for now; web preview persistence gets localStorage coverage so the learning records can be exercised before SQLite migrations exist.

**Tech Stack:** TypeScript, React/Vite, Vitest, localStorage preview store, existing `src/domain` pure functions.

## Execution Progress

- 2026-06-29: Completed predictive `PlaceProfile` fields and policy metadata on generated `Opportunity` records.
- 2026-06-29: Added learning-loop types and pure helpers for feedback events, model claims, reflections, skills, and GUI Office workbench artifacts.
- 2026-06-29: Extended `WorldSnapshot` to carry learning records while keeping `godotWorldState` free of GUI Office feedback artifacts.
- 2026-06-29: Added web-preview localStorage persistence helpers for feedback events, reflections, skills, and workbench artifacts.
- 2026-06-29: Updated sample data and `docs/product.md` schema notes for the implemented records.
- Verification run: `npm test -- src/domain/worldEngine.test.ts src/domain/learningLoop.test.ts src/domain/worldSnapshot.test.ts src/integrations/localStore.test.ts` passed with 20 tests.
- Verification run: `npm run build` passed; Vite still reports existing large chunk warnings for Mapbox and HEIC bundles.
- Final verification run: `npm test -- --run` passed with 17 files and 76 tests.
- Final verification run: `npm run build` passed with `tsc` and `vite build`; Vite still reports existing large chunk warnings for Mapbox and HEIC bundles.
- Final verification run: `/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot --quit` passed.
- Final verification run: `/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot res://scenes/layer3_world.tscn --quit-after 1` passed.

---

## Supplemental Context From Agent Transcript

The added interview material does not change the plan shape, but it tightens the reason for the fields:

- `EventMeaning`, `PlaceProfile`, `Opportunity`, `Reflection`, and `Skill` should be treated as symbolic handles, not prose summaries.
- `PlaceProfile` models a user micro-world: local rules, rhythms, risks, relationships, and likely effects of future actions.
- `FeedbackEvent` is the deployment learning signal. Real confirmations, corrections, dismissals, and completions are more important than offline speculation.
- `WorkbenchArtifact` is the GUI Office surface for auditing symbolic claims. It should make the agent's belief legible before that belief changes the Godot world.
- Godot/GUI/HTML are not competing layers. Godot expresses stable world state immersively; GUI Office captures validation and correction; both read and write through structured domain objects.
- Hawkins's reference-frame framing means `PlaceProfile` should preserve relative structure and affordances, not just aggregate counts. It should answer what this place predicts, enables, blocks, or connects to.
- The "columns vote" framing maps to `ModelClaim` and `WorkbenchArtifact`: agent beliefs can be partial, competing, and low-confidence before they become approved world state.
- Godot should render stable consensus. GUI Office should expose uncertainty, disagreement, and evidence so the user can resolve it.

These points are already represented in the tasks below, so the implementation should avoid adding another broad subsystem before these core records work.

---

## File Structure

- Modify `src/domain/types.ts`: add shared model types for predictive place state, policy outputs, feedback events, reflections, skills, model claims, and GUI Office artifacts.
- Modify `src/domain/worldEngine.ts`: populate predictive `PlaceProfile` fields and policy metadata on generated opportunities.
- Modify `src/domain/worldEngine.test.ts`: verify predictive place state and controller/policy opportunity metadata.
- Create `src/domain/learningLoop.ts`: pure helpers for creating feedback events, model claims, reflections, skills, and GUI Office artifacts.
- Create `src/domain/learningLoop.test.ts`: unit tests for the learning-loop helpers.
- Modify `src/domain/worldSnapshot.ts`: include optional learning records and GUI Office artifacts in `WorldSnapshot`.
- Modify `src/domain/worldSnapshot.test.ts`: verify snapshots can carry feedback/reflection/skill/workbench data without leaking raw media into Godot.
- Modify `src/integrations/localStore.ts`: add web-preview persistence for feedback events, reflections, skills, and workbench artifacts.
- Modify `src/integrations/localStore.test.ts`: verify new persistence helpers round-trip records.
- Modify `src/data/sampleData.ts`: add small sample feedback/reflection/skill/workbench records for development preview.
- Modify `docs/product.md`: align the documented core tables and `PlaceProfile` / `Opportunity` fields with the implemented types.

---

## Task 1: Add Personal World Model Types

**Files:**
- Modify: `src/domain/types.ts`
- Test: `src/domain/worldEngine.test.ts`

- [x] **Step 1: Write failing type-usage tests for predictive place state and opportunity policy metadata**

Add this test near the end of `src/domain/worldEngine.test.ts`:

```ts
it("builds a predictive place state that can drive future action", () => {
  const profile = buildPlaceProfile(xixi, events);

  expect(profile.stateSummary).toContain("西溪湿地");
  expect(profile.timePattern.dominantPartOfDay).toBe("morning");
  expect(profile.emotionPattern.averageValence).toBeGreaterThan(0);
  expect(profile.activityAffordances).toContain("recovery");
  expect(profile.prediction.bestNextActions.length).toBeGreaterThan(0);
  expect(profile.prediction.ifNearby).toContain("可能");
  expect(profile.confidence).toBeGreaterThan(0.5);
  expect(profile.reviewState).toBe("suggested");
  expect(profile.profileVersion).toBe(1);
});

it("marks opportunities as controller policy outputs rather than world model state", () => {
  const profile = buildPlaceProfile(xixi, events);
  const [opportunity] = generateOpportunities([profile], events);

  expect(opportunity.policyType).toBeTruthy();
  expect(opportunity.hypothesis).toContain(profile.placeName);
  expect(opportunity.expectedWorldDelta).toBeTruthy();
  expect(opportunity.sourceProfileVersion).toBe(profile.profileVersion);
  expect(opportunity.feedbackSummary).toEqual({
    acceptedCount: 0,
    dismissedCount: 0,
    completedCount: 0
  });
});
```

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/domain/worldEngine.test.ts
```

Expected: FAIL with TypeScript or assertion errors because `stateSummary`, `timePattern`, `policyType`, and related fields do not exist yet.

- [x] **Step 3: Add new shared types**

Add these types to `src/domain/types.ts` after `PlaceProfile`'s dependencies and before `PlaceProfile`:

```ts
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
```

Extend `PlaceProfile` in `src/domain/types.ts` with these fields:

```ts
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
```

Add these types before `Opportunity`:

```ts
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
```

Extend `Opportunity` with:

```ts
  policyType: OpportunityPolicyType;
  hypothesis: string;
  expectedWorldDelta: ExpectedWorldDelta;
  sourceProfileVersion: number;
  feedbackSummary: OpportunityFeedbackSummary;
```

- [x] **Step 4: Run typecheck and verify it fails in implementation sites**

Run:

```bash
npm run build
```

Expected: FAIL because `buildPlaceProfile` and `generateOpportunities` do not yet return the new required fields.

---

## Task 2: Populate Predictive PlaceProfile State

**Files:**
- Modify: `src/domain/worldEngine.ts`
- Test: `src/domain/worldEngine.test.ts`

- [x] **Step 1: Add helper functions in `worldEngine.ts`**

Add these helpers after `countTags`:

```ts
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
  const hours = events
    .map((event) => new Date(event.startTime).getHours())
    .filter((hour) => Number.isFinite(hour));
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
```

- [x] **Step 2: Populate new fields in `buildPlaceProfile`**

Inside `buildPlaceProfile`, after `const overloadRisk = ...`, add:

```ts
  const timePattern = buildTimePattern(events);
  const emotionPattern = buildEmotionPattern(events);
  const socialPattern = buildSocialPattern(events);
  const activityAffordances = Array.from(new Set([
    ...(recovery >= 0.6 ? ["recovery" as const] : []),
    ...(mediaCount >= 3 ? ["memory" as const, "record" as const] : []),
    ...(financeWeight >= 0.35 ? ["finance" as const] : []),
    ...(inferRole(place, events) === "work" ? ["work" as const, "project" as const] : []),
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
```

In the returned object, add:

```ts
    stateSummary: `${place.name} 当前是 ${inferRole(place, events)} 倾向地点，承载 ${visitCount} 次访问、${mediaCount} 条媒体证据和 ${steps} 步行动信号。`,
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
    lastReflectedAt: undefined,
```

- [x] **Step 3: Run focused tests**

Run:

```bash
npm test -- src/domain/worldEngine.test.ts
```

Expected: FAIL only on opportunity policy metadata, while the new predictive profile test passes.

---

## Task 3: Add Policy Metadata to Opportunities

**Files:**
- Modify: `src/domain/worldEngine.ts`
- Test: `src/domain/worldEngine.test.ts`

- [x] **Step 1: Add an opportunity metadata helper**

Add this helper before `generateOpportunities`:

```ts
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
  feedbackSummary: baseFeedbackSummary
});
```

- [x] **Step 2: Add metadata to recovery opportunities**

In the recovery opportunity object, after `status: "new"`, add:

```ts
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
```

Add a comma after `status: "new"` before spreading metadata.

- [x] **Step 3: Add metadata to memory opportunities**

In the memory opportunity object, after `status: "new"`, add:

```ts
        ...policyMetadata(profile, {
          policyType: "record",
          hypothesis: `${profile.placeName} 已经有足够媒体证据，可以从地点状态转成记忆节点。`,
          expectedWorldDelta: {
            nodeId: `world-${profile.placeId}`,
            unlockKey: "memory-shelf",
            explanation: "整理记忆后，Godot 世界可以解锁记忆书架或时间胶片。"
          }
        })
```

- [x] **Step 4: Add metadata to work opportunities**

In the work opportunity object, after `status: "new"`, add:

```ts
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
```

- [x] **Step 5: Add metadata to finance opportunities**

In the finance opportunity object, after `status: "new"`, add:

```ts
        ...policyMetadata(profile, {
          policyType: "do",
          hypothesis: `${profile.placeName} 的财务权重支持一次轻量复盘。`,
          expectedWorldDelta: {
            nodeId: `world-${profile.placeId}`,
            unlockKey: "finance-review",
            explanation: "完成复盘后，财务楼可以点亮账本墙。"
          }
        })
```

- [x] **Step 6: Run focused tests**

Run:

```bash
npm test -- src/domain/worldEngine.test.ts
```

Expected: PASS.

- [x] **Step 7: Commit Task 1-3 together**

Run:

```bash
git add src/domain/types.ts src/domain/worldEngine.ts src/domain/worldEngine.test.ts
git commit -m "feat: add personal world model state"
```

Expected: commit succeeds.

---

## Task 4: Add Feedback, Reflection, Skill, Claim, and Workbench Helpers

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/learningLoop.ts`
- Create: `src/domain/learningLoop.test.ts`

- [x] **Step 1: Add learning-loop types**

Add these types to `src/domain/types.ts` after `OpportunityAction`:

```ts
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
```

- [x] **Step 2: Write failing tests for the learning loop**

Create `src/domain/learningLoop.test.ts`:

```ts
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
```

- [x] **Step 3: Run the new test and verify it fails**

Run:

```bash
npm test -- src/domain/learningLoop.test.ts
```

Expected: FAIL because `src/domain/learningLoop.ts` does not exist.

- [x] **Step 4: Implement `learningLoop.ts`**

Create `src/domain/learningLoop.ts`:

```ts
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
    confidence: Math.min(1, Math.max(0, Number(input.confidence.toFixed(2)))),
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
```

- [x] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/domain/learningLoop.test.ts
```

Expected: PASS.

---

## Task 5: Carry Learning Records Through WorldSnapshot

**Files:**
- Modify: `src/domain/worldSnapshot.ts`
- Modify: `src/domain/worldSnapshot.test.ts`

- [x] **Step 1: Write failing snapshot test**

Add this test to `src/domain/worldSnapshot.test.ts`:

```ts
it("carries GUI office learning records without sending them to Godot", () => {
  const snapshot = createWorldSnapshot({
    places,
    events,
    userId: "alex",
    timeline: timelineStages,
    feedbackEvents: [
      {
        id: "feedback-place_profile-place-xixi-confirm-20260510100000",
        targetType: "place_profile",
        targetId: "place-xixi",
        action: "confirm",
        userNote: "这里确实是恢复点",
        createdAt: "2026-05-10T10:00:00+08:00"
      }
    ],
    reflections: [
      {
        id: "reflection-place-20260510100500",
        scope: "place",
        sourceEventIds: ["event-xixi-walk"],
        sourceFeedbackIds: ["feedback-place_profile-place-xixi-confirm-20260510100000"],
        summary: "西溪湿地的低负荷散步对恢复有效。",
        confidence: 0.82,
        status: "confirmed",
        createdAt: "2026-05-10T10:05:00+08:00"
      }
    ],
    skills: [
      {
        id: "skill-reflection-place-20260510100500",
        title: "西溪湿地恢复散步",
        trigger: "当恢复机会出现",
        procedure: "建议 20 分钟低负荷散步。",
        sourceReflectionIds: ["reflection-place-20260510100500"],
        successCount: 0,
        failureCount: 0,
        status: "draft",
        createdAt: "2026-05-10T10:10:00+08:00",
        updatedAt: "2026-05-10T10:10:00+08:00"
      }
    ],
    workbenchArtifacts: [
      {
        id: "workbench-place-inspector-place-xixi-20260510100000",
        artifactType: "place_inspector",
        title: "西溪湿地 地点检查台",
        targetType: "place_profile",
        targetId: "place-xixi",
        summary: "地点状态可检查、可修正、可批准。",
        modelClaimIds: [],
        feedbackEventIds: ["feedback-place_profile-place-xixi-confirm-20260510100000"],
        status: "ready",
        createdAt: "2026-05-10T10:00:00+08:00",
        updatedAt: "2026-05-10T10:00:00+08:00"
      }
    ]
  });

  expect(snapshot.feedbackEvents).toHaveLength(1);
  expect(snapshot.reflections[0].summary).toContain("恢复");
  expect(snapshot.skills[0].status).toBe("draft");
  expect(snapshot.workbenchArtifacts[0].artifactType).toBe("place_inspector");
  expect(JSON.stringify(snapshot.godotWorldState)).not.toContain("feedback-place_profile");
  expect(JSON.stringify(snapshot.godotWorldState)).not.toContain("地点检查台");
});
```

- [x] **Step 2: Run snapshot test and verify it fails**

Run:

```bash
npm test -- src/domain/worldSnapshot.test.ts
```

Expected: FAIL because `createWorldSnapshot` does not accept or return the learning record arrays.

- [x] **Step 3: Extend `WorldSnapshot` and `createWorldSnapshot` input**

In `src/domain/worldSnapshot.ts`, update the type import from `./types` to include:

```ts
FeedbackEvent,
Reflection,
Skill,
WorkbenchArtifact
```

Extend `WorldSnapshot`:

```ts
  feedbackEvents: FeedbackEvent[];
  reflections: Reflection[];
  skills: Skill[];
  workbenchArtifacts: WorkbenchArtifact[];
```

Extend `createWorldSnapshot` input:

```ts
  feedbackEvents?: FeedbackEvent[];
  reflections?: Reflection[];
  skills?: Skill[];
  workbenchArtifacts?: WorkbenchArtifact[];
```

Add these fields to the returned object:

```ts
    feedbackEvents: input.feedbackEvents ?? [],
    reflections: input.reflections ?? [],
    skills: input.skills ?? [],
    workbenchArtifacts: input.workbenchArtifacts ?? [],
```

- [x] **Step 4: Run snapshot tests**

Run:

```bash
npm test -- src/domain/worldSnapshot.test.ts
```

Expected: PASS.

---

## Task 6: Persist Learning Records in Web Preview Store

**Files:**
- Modify: `src/integrations/localStore.ts`
- Modify: `src/integrations/localStore.test.ts`

- [x] **Step 1: Write failing localStore tests**

Update the import in `src/integrations/localStore.test.ts` to include:

```ts
import type { FeedbackEvent, Reflection, Skill, WorkbenchArtifact } from "../domain/types";
```

Update the localStore import to include:

```ts
  loadStoredFeedbackEvents,
  loadStoredReflections,
  loadStoredSkills,
  loadStoredWorkbenchArtifacts,
  saveStoredFeedbackEvents,
  saveStoredReflections,
  saveStoredSkills,
  saveStoredWorkbenchArtifacts
```

Add this test near the end:

```ts
it("persists GUI office learning records in the web preview store", () => {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value)
    }
  };
  const feedbackEvents: FeedbackEvent[] = [
    {
      id: "feedback-1",
      targetType: "place_profile",
      targetId: "place-xixi",
      action: "confirm",
      createdAt: "2026-05-10T10:00:00+08:00"
    }
  ];
  const reflections: Reflection[] = [
    {
      id: "reflection-1",
      scope: "place",
      sourceEventIds: ["event-xixi-walk"],
      sourceFeedbackIds: ["feedback-1"],
      summary: "西溪湿地适合作为恢复节点。",
      confidence: 0.82,
      status: "confirmed",
      createdAt: "2026-05-10T10:05:00+08:00"
    }
  ];
  const skills: Skill[] = [
    {
      id: "skill-1",
      title: "恢复散步",
      trigger: "恢复机会出现",
      procedure: "安排 20 分钟散步。",
      sourceReflectionIds: ["reflection-1"],
      successCount: 0,
      failureCount: 0,
      status: "draft",
      createdAt: "2026-05-10T10:10:00+08:00",
      updatedAt: "2026-05-10T10:10:00+08:00"
    }
  ];
  const artifacts: WorkbenchArtifact[] = [
    {
      id: "artifact-1",
      artifactType: "place_inspector",
      title: "西溪湿地 地点检查台",
      targetType: "place_profile",
      targetId: "place-xixi",
      summary: "地点状态可检查。",
      modelClaimIds: [],
      feedbackEventIds: ["feedback-1"],
      status: "ready",
      createdAt: "2026-05-10T10:00:00+08:00",
      updatedAt: "2026-05-10T10:00:00+08:00"
    }
  ];

  saveStoredFeedbackEvents(feedbackEvents);
  saveStoredReflections(reflections);
  saveStoredSkills(skills);
  saveStoredWorkbenchArtifacts(artifacts);

  expect(loadStoredFeedbackEvents([])).toEqual(feedbackEvents);
  expect(loadStoredReflections([])).toEqual(reflections);
  expect(loadStoredSkills([])).toEqual(skills);
  expect(loadStoredWorkbenchArtifacts([])).toEqual(artifacts);
});
```

- [x] **Step 2: Run localStore test and verify it fails**

Run:

```bash
npm test -- src/integrations/localStore.test.ts
```

Expected: FAIL because the new persistence helpers do not exist.

- [x] **Step 3: Implement new persistence helpers**

In `src/integrations/localStore.ts`, update the type import:

```ts
import type { EventRecord, FeedbackEvent, HermesAnalysisJob, MediaAsset, Reflection, Skill, WorkbenchArtifact } from "../domain/types";
```

Add constants after the existing storage keys:

```ts
const FEEDBACK_EVENTS_STORAGE_KEY = "memory-map.feedback-events";
const REFLECTIONS_STORAGE_KEY = "memory-map.reflections";
const SKILLS_STORAGE_KEY = "memory-map.skills";
const WORKBENCH_ARTIFACTS_STORAGE_KEY = "memory-map.workbench-artifacts";
```

Add this generic helper below `saveStoredHermesJobs`:

```ts
function loadStoredArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredArray<T>(key: string, records: T[], limit = 100) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(records.slice(0, limit)));
}
```

Add exported helpers:

```ts
export function loadStoredFeedbackEvents(fallback: FeedbackEvent[]): FeedbackEvent[] {
  return loadStoredArray(FEEDBACK_EVENTS_STORAGE_KEY, fallback);
}

export function saveStoredFeedbackEvents(events: FeedbackEvent[]) {
  saveStoredArray(FEEDBACK_EVENTS_STORAGE_KEY, events, 200);
}

export function loadStoredReflections(fallback: Reflection[]): Reflection[] {
  return loadStoredArray(REFLECTIONS_STORAGE_KEY, fallback);
}

export function saveStoredReflections(reflections: Reflection[]) {
  saveStoredArray(REFLECTIONS_STORAGE_KEY, reflections, 100);
}

export function loadStoredSkills(fallback: Skill[]): Skill[] {
  return loadStoredArray(SKILLS_STORAGE_KEY, fallback);
}

export function saveStoredSkills(skills: Skill[]) {
  saveStoredArray(SKILLS_STORAGE_KEY, skills, 100);
}

export function loadStoredWorkbenchArtifacts(fallback: WorkbenchArtifact[]): WorkbenchArtifact[] {
  return loadStoredArray(WORKBENCH_ARTIFACTS_STORAGE_KEY, fallback);
}

export function saveStoredWorkbenchArtifacts(artifacts: WorkbenchArtifact[]) {
  saveStoredArray(WORKBENCH_ARTIFACTS_STORAGE_KEY, artifacts, 100);
}
```

- [x] **Step 4: Run localStore tests**

Run:

```bash
npm test -- src/integrations/localStore.test.ts
```

Expected: PASS.

---

## Task 7: Add Sample Learning Records and Documentation Alignment

**Files:**
- Modify: `src/data/sampleData.ts`
- Modify: `docs/product.md`
- Test: `src/domain/worldSnapshot.test.ts`
- Test: `npm run build`

- [x] **Step 1: Add sample learning records**

In `src/data/sampleData.ts`, add this import:

```ts
import {
  createFeedbackEvent,
  createModelClaimForPlaceProfile,
  createPlaceInspectorArtifact,
  createReflectionFromFeedback,
  createSkillFromReflection
} from "../domain/learningLoop";
```

After `export const sampleSnapshot = createWorldSnapshot(...)`, add:

```ts
export const sampleXixiProfile = sampleSnapshot.profiles.find((profile) => profile.placeId === "place-xixi");

export const sampleFeedbackEvents = sampleXixiProfile
  ? [
      createFeedbackEvent({
        targetType: "place_profile",
        targetId: sampleXixiProfile.placeId,
        action: "confirm",
        userNote: "这里确实是恢复和生活节点。",
        now: "2026-05-10T10:00:00+08:00"
      })
    ]
  : [];

export const sampleModelClaims = sampleXixiProfile
  ? [createModelClaimForPlaceProfile(sampleXixiProfile, "2026-05-10T10:00:00+08:00")]
  : [];

export const sampleReflections = sampleFeedbackEvents.length
  ? [
      createReflectionFromFeedback({
        scope: "place",
        sourceEventIds: ["event-xixi-walk"],
        feedbackEvents: sampleFeedbackEvents,
        summary: "西溪湿地的低负荷散步和媒体记录能稳定提升恢复感。",
        confidence: 0.82,
        now: "2026-05-10T10:05:00+08:00"
      })
    ]
  : [];

export const sampleSkills = sampleReflections.length
  ? [
      createSkillFromReflection({
        reflection: sampleReflections[0],
        title: "西溪湿地恢复散步",
        trigger: "当西溪湿地出现恢复机会且当天负荷不高",
        procedure: "建议 20 分钟低负荷散步，并在完成后记录一条恢复事件。",
        now: "2026-05-10T10:10:00+08:00"
      })
    ]
  : [];

export const sampleWorkbenchArtifacts = sampleXixiProfile
  ? [
      createPlaceInspectorArtifact({
        profile: sampleXixiProfile,
        claims: sampleModelClaims,
        feedbackEvents: sampleFeedbackEvents,
        now: "2026-05-10T10:00:00+08:00"
      })
    ]
  : [];
```

- [x] **Step 2: Update `sampleSnapshot` to carry learning records**

Replace the `sampleSnapshot` call with this pattern:

```ts
export const sampleSnapshotBase = createWorldSnapshot({
  userId: "alex",
  places,
  events,
  eventMeanings: [robotExhibitionMeaning],
  timeline: timelineStages,
  generatedAt: "2026-05-04T10:00:00+08:00"
});
```

Then build learning records from `sampleSnapshotBase`, and add:

```ts
export const sampleSnapshot = {
  ...sampleSnapshotBase,
  feedbackEvents: sampleFeedbackEvents,
  reflections: sampleReflections,
  skills: sampleSkills,
  workbenchArtifacts: sampleWorkbenchArtifacts
};
```

Keep the existing exports at the bottom:

```ts
export const profiles = sampleSnapshot.profiles;
export const worldNodes = sampleSnapshot.worldNodes;
export const unlocks = sampleSnapshot.unlocks;
export const agentContext = sampleSnapshot.agentContext;
export const aiSuggestion = sampleSnapshot.aiSuggestion;
```

- [x] **Step 3: Update docs/product.md core tables**

In `docs/product.md`, update the core table list to include:

```text
feedback_events
reflections
skills
model_claims
workbench_artifacts
```

Under `### place_profiles`, add:

```text
state_summary
time_pattern_json
emotion_pattern_json
social_pattern_json
activity_affordances_json
risk_priors_json
opportunity_priors_json
prediction_json
confidence
review_state
profile_version
last_reflected_at
```

Under `### opportunities`, add:

```text
policy_type
hypothesis
expected_world_delta_json
source_profile_version
feedback_summary_json
```

Add sections after `### opportunity_actions`:

```markdown
### feedback_events

- id
- user_id
- target_type
- target_id
- action
- user_note
- before_json
- after_json
- created_at

### reflections

- id
- user_id
- scope
- source_event_ids
- source_feedback_ids
- summary
- confidence
- status
- created_at

### skills

- id
- user_id
- title
- trigger
- procedure
- source_reflection_ids
- success_count
- failure_count
- status
- created_at
- updated_at

### model_claims

- id
- user_id
- target_type
- target_id
- claim_type
- claim_text
- evidence_refs
- confidence
- review_state
- created_at
- updated_at

### workbench_artifacts

- id
- user_id
- artifact_type
- title
- target_type
- target_id
- summary
- model_claim_ids
- feedback_event_ids
- status
- created_at
- updated_at
```

- [x] **Step 4: Run all domain and integration tests touched by this plan**

Run:

```bash
npm test -- src/domain/worldEngine.test.ts src/domain/learningLoop.test.ts src/domain/worldSnapshot.test.ts src/integrations/localStore.test.ts
```

Expected: PASS.

- [x] **Step 5: Run full build**

Run:

```bash
npm run build
```

Expected: PASS with `tsc` and `vite build` completing successfully.

- [x] **Step 6: Commit remaining changes**

Run:

```bash
git add src/domain/types.ts src/domain/learningLoop.ts src/domain/learningLoop.test.ts src/domain/worldSnapshot.ts src/domain/worldSnapshot.test.ts src/integrations/localStore.ts src/integrations/localStore.test.ts src/data/sampleData.ts docs/product.md
git commit -m "feat: add personal world model learning records"
```

Expected: commit succeeds.

---

## Self-Review

Spec coverage:

- Predictive `PlaceProfile` fields are covered by Tasks 1 and 2.
- `Opportunity` as controller / policy output is covered by Tasks 1 and 3.
- Feedback, reflection, skill, model claim, and workbench artifacts are covered by Task 4.
- Snapshot and Godot boundary are covered by Task 5.
- Web preview persistence is covered by Task 6.
- `product.md` alignment is covered by Task 7.

Red-flag scan:

- No task uses open-ended incomplete steps.
- Every new type and helper has concrete code.
- Every test command has expected output.

Type consistency:

- TypeScript names use existing camelCase code style.
- Product documentation keeps snake_case table fields for SQLite-style schema.
- `Opportunity` keeps the existing `layer3Expression` field and adds `expectedWorldDelta` for policy/planning semantics.
