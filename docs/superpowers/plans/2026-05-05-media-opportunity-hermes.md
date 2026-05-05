# Media Import Opportunity Hermes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the MVP loop for importing images, notes, and audio, analyzing them through Hermes-safe semantic payloads, generating opportunities, and surfacing the results in the Memory Map UI.

**Architecture:** Keep the domain logic in `src/domain`, Hermes payload construction in `src/integrations`, browser persistence in `src/integrations/localStore.ts`, and UI controls in `src/App.tsx`. The app remains local-first: imported raw media stays in browser/local storage metadata, while Hermes receives summaries, text, and transcripts only.

**Tech Stack:** React 19, TypeScript, Vitest, Vite, localStorage preview store, optional Hermes gateway via `VITE_HERMES_GATEWAY_URL`.

---

### Task 1: Domain Opportunity And Media Context

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/worldEngine.ts`
- Modify: `src/domain/worldEngine.test.ts`
- Modify: `src/domain/worldSnapshot.ts`
- Modify: `src/domain/worldSnapshot.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that expect:

```ts
expect(context.activeOpportunities[0]).toContain("恢复");
expect(context.mediaAssetSummary).toContain("1 imported assets");
expect(snapshot.opportunities.map((item) => item.type)).toContain("recovery");
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/domain/worldEngine.test.ts src/domain/worldSnapshot.test.ts --run`

Expected: FAIL because opportunities and media context are not yet exposed.

- [ ] **Step 3: Implement minimal domain support**

Add `Opportunity`, `OpportunityAction`, `HermesAnalysisJob`, `mediaAssetSummary`, `activeOpportunities`, `generateOpportunities`, and include opportunities in `WorldSnapshot`.

- [ ] **Step 4: Run domain tests**

Run: `npm test -- src/domain/worldEngine.test.ts src/domain/worldSnapshot.test.ts --run`

Expected: PASS.

### Task 2: Hermes Analysis Payload

**Files:**
- Create: `src/integrations/hermesAgent.test.ts`
- Modify: `src/integrations/hermesAgent.ts`

- [ ] **Step 1: Write failing tests**

Add tests that expect a media-analysis Hermes payload to include transcript/text, active opportunities, semantic-summary privacy metadata, and no raw file path.

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/integrations/hermesAgent.test.ts --run`

Expected: FAIL because media analysis payload helpers do not exist.

- [ ] **Step 3: Implement minimal Hermes helpers**

Add `createHermesMediaAnalysisPayload`, `createHermesAnalysisJob`, and `sendMediaAssetToHermes` using the existing gateway pattern.

- [ ] **Step 4: Run Hermes tests**

Run: `npm test -- src/integrations/hermesAgent.test.ts --run`

Expected: PASS.

### Task 3: UI Import Usability And Opportunity Surface

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing UI assertions**

Add SSR assertions for `本地导入`, `选择文件`, `录音转写`, `主机会`, and `Hermes 分析`.

- [ ] **Step 2: Run UI test to verify failure**

Run: `npm test -- src/App.test.tsx --run`

Expected: FAIL for at least the missing opportunity/Hermes analysis UI.

- [ ] **Step 3: Implement UI**

Enhance `MediaImport` with real file selection metadata, transcript field for audio, imported feed, and an opportunity panel that reads from `snapshot.opportunities`.

- [ ] **Step 4: Run UI test**

Run: `npm test -- src/App.test.tsx --run`

Expected: PASS.

### Task 4: Full Verification

**Files:**
- All modified source and tests.

- [ ] **Step 1: Run full tests**

Run: `npm test -- --run`

Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS.
