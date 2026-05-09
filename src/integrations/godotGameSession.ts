export type GodotGameSessionRequest = {
  worldSlug: string;
  worldTitle: string;
  embedInWindow?: boolean;
};

export type GodotGameSessionResult = {
  sessionId: string;
  status: "completed" | "failed";
  worldSlug: string;
  completedTasks: string[];
  visitedRooms: string[];
  sessionPath: string;
};

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

async function loadTauriInvoke(): Promise<TauriInvoke> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke as TauriInvoke;
}

export async function startGodotGameSession(
  request: GodotGameSessionRequest,
  invokeOverride?: TauriInvoke
): Promise<GodotGameSessionResult> {
  const invoke = invokeOverride ?? await loadTauriInvoke();
  return invoke<GodotGameSessionResult>("start_game_session", { request });
}
