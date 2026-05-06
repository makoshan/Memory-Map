# Homepage World OS Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the native SwiftUI homepage so it matches the product design image's World OS first screen.

**Architecture:** Add a tested `HomeDashboardLayout` model in `MemoryMapNativeCore`, then render it through focused SwiftUI views. Keep import, office, and memory pages intact while replacing only the home/world shell and homepage visual system.

**Tech Stack:** Swift 6, SwiftUI, AppKit image loading, SwiftPM, XCTest.

---

## Tasks

- [x] Write a failing `HomeDashboardLayoutTests` test for the design source of truth.
- [x] Add `HomeDashboardLayout.swift` with sidebar items, building points, status metrics, city tabs, and life stages.
- [x] Update `DESIGN.md` with Homepage / World OS source-of-truth rules.
- [x] Replace `RootView`'s default split view with a custom profile sidebar shell.
- [x] Rebuild `WorldDashboard` as a single World OS first screen with central map, detail rail, focus strip, and timeline.
- [x] Run `swift test`, `swift build`, and `scripts/build-native-app.sh`.
- [x] Open the compiled app for visual review.
