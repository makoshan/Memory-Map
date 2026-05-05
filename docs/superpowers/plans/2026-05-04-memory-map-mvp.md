# Memory Map MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable MVP from `docs/product.md`: a Tauri + React + TypeScript desktop app with Mapbox-ready geometry, SQLite-ready local data, Layer 1 semantic profiles, Layer 2 world generation, Layer 3 personal unlocks, and Hermes Agent suggestion boundaries.

**Architecture:** The app separates domain logic from UI. `src/domain` owns Event, PlaceProfile, world node, unlock, and AI context rules with Vitest coverage. `src/app` renders the dashboard, world map, room panels, timeline, and AI suggestions from deterministic sample data so the MVP is usable before real GPS, Mapbox tokens, or Hermes runtime are connected.

**Tech Stack:** Tauri, React, TypeScript, Vite, Vitest, Mapbox GL, SQLite through Tauri Rust commands, Hermes Agent through a local adapter boundary.

---

### Task 1: Project Scaffold And Domain Tests

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/domain/worldEngine.test.ts`

- [x] **Step 1: Write failing tests**

Create tests that import `buildPlaceProfile`, `generateWorldNode`, `generateUnlocks`, and `buildAgentContext` before those modules exist.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/domain/worldEngine.test.ts`
Expected: FAIL because `src/domain/worldEngine.ts` is missing.

### Task 2: World Engine Domain

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/worldEngine.ts`
- Modify: `src/domain/worldEngine.test.ts`

- [x] **Step 1: Implement minimal world engine**

Define typed Event, PlaceProfile, WorldNode, GameUnlock, and AgentContextSnapshot models. Implement deterministic scoring from visits, media, steps, finance events, and work tags.

- [x] **Step 2: Run tests**

Run: `npm test -- --run src/domain/worldEngine.test.ts`
Expected: PASS.

### Task 3: React MVP Shell

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/data/sampleData.ts`

- [x] **Step 1: Render product experience**

Build the first screen as the actual app: left navigation, central Layer 3 world, top Layer 0 status, Layer 1/2 pipeline, rooms, today tasks, AI three-line panel, city/time panels, and unlock states.

- [x] **Step 2: Verify web app starts**

Run: `npm run dev -- --host 127.0.0.1`
Expected: Vite serves the app successfully.

### Task 4: Tauri, SQLite, And Hermes Boundaries

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src/integrations/hermesAgent.ts`
- Create: `src/integrations/localStore.ts`

- [x] **Step 1: Add local boundaries**

Add SQLite schema initialization commands in Rust and TypeScript adapters for Hermes Agent and local storage.

- [x] **Step 2: Verify static checks**

Run: `npm run build`
Expected: TypeScript and Vite build pass.

### Task 5: Final Verification

**Files:**
- Modify: no production files unless verification finds a concrete issue.

- [x] **Step 1: Run tests**

Run: `npm test -- --run`
Expected: PASS.

- [x] **Step 2: Run build**

Run: `npm run build`
Expected: PASS.
