import { describe, expect, it, vi } from "vitest";
import { startGodotGameSession } from "./godotGameSession";

describe("startGodotGameSession", () => {
  it("delegates the Hangzhou world launch to the Tauri command", async () => {
    const invoke = vi.fn().mockResolvedValue({
      sessionId: "session-hangzhou-1",
      status: "completed",
      worldSlug: "hangzhou",
      completedTasks: ["整理今日记忆"],
      visitedRooms: ["办公室"],
      sessionPath: "/tmp/memory-map/game-session.json"
    });

    const result = await startGodotGameSession({
      worldSlug: "hangzhou",
      worldTitle: "杭州像素岛",
      embedInWindow: true
    }, invoke);

    expect(invoke).toHaveBeenCalledWith("start_game_session", {
      request: {
        worldSlug: "hangzhou",
        worldTitle: "杭州像素岛",
        embedInWindow: true
      }
    });
    expect(result).toMatchObject({
      sessionId: "session-hangzhou-1",
      status: "completed",
      worldSlug: "hangzhou",
      completedTasks: ["整理今日记忆"],
      visitedRooms: ["办公室"]
    });
  });
});
