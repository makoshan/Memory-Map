import type { MemoryItem } from "../domain/memoryRoom";

export type NativeMediaImportResult = {
  items: MemoryItem[];
};

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

async function loadTauriInvoke(): Promise<TauriInvoke> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke as TauriInvoke;
}

export async function importMediaFilesWithNativeSidecar(
  paths: string[],
  invokeOverride?: TauriInvoke
): Promise<NativeMediaImportResult> {
  if (paths.length === 0) return { items: [] };

  const invoke = invokeOverride ?? await loadTauriInvoke();
  return invoke<NativeMediaImportResult>("import_media_files", { paths });
}
