import { describe, expect, it } from "vitest";
import { godotWorldState } from "../data/godotWorldState";

describe("Godot world-state bridge", () => {
  it("exports semantic Layer 1 data as a Godot-only Layer 3 contract", () => {
    expect(godotWorldState.bridge.appShell).toBe("tauri-react");
    expect(godotWorldState.bridge.gameLayer).toBe("godot-4.6");
    expect(godotWorldState.nodes.length).toBeGreaterThan(0);
    expect(godotWorldState.nodes[0].assetKey).toMatch(/life|office|memory|finance|home/);
    expect(godotWorldState.nodes[0].visual.sizeScale).toBeGreaterThan(1);
  });

  it("does not send raw coordinates or raw event records into the game layer", () => {
    const payload = JSON.stringify(godotWorldState);

    expect(payload).not.toContain("\"lat\"");
    expect(payload).not.toContain("\"lng\"");
    expect(payload).not.toContain("event-xixi-walk");
    expect(payload).not.toContain("amount");
  });

  it("keeps AI output short enough for a Godot overlay", () => {
    expect(godotWorldState.ai.conclusion.length).toBeLessThan(80);
    expect(godotWorldState.ai.suggestion.length).toBeLessThan(90);
    expect(godotWorldState.ai.risk.length).toBeLessThan(80);
  });
});
