# MemoryMapNative

First native macOS rewrite prototype for Memory Map, built with SwiftUI and SwiftPM.

## Run

```bash
cd native/MemoryMapNative
swift run MemoryMapNative
```

## Test

```bash
cd native/MemoryMapNative
swift test
```

## Current Scope

- Native `NavigationSplitView` shell for World Map, Office, Memory Room, and Import Lab.
- SwiftUI cards and dashboards based on the existing `DESIGN.md` tokens.
- Existing image assets are loaded from the repository `public/assets` directory at runtime.
- `MemoryMapNativeCore` ports city detection, media type inference, memory samples, and city grouping into testable Swift.
- The Import Lab uses `NSOpenPanel` and local inference to create memory cards.
- Memory cards, Hermes queue state, and world export state persist to Application Support as JSON.
- Swift ports now cover the React/Tauri equivalents for import progress, duplicate detection, local store, Hermes offline jobs, and world sync thresholds.

The existing `native/MemoryMapSidecar` package can be folded in next for durable SQLite storage, thumbnails, and EXIF evidence.

## React/Tauri Parity Map

| Existing area | Native SwiftUI replacement |
| --- | --- |
| `src/App.tsx` routes | `NavigationSplitView` sections: World Map, Office, Memory Room, Import Lab |
| `src/components/MemoryRoom.tsx` | `MemoryDashboard`, `ImportDashboard`, native file picker, memory cards |
| `src/domain/memoryRoom.ts` | `MemoryModels.swift`, `ImportPipeline.swift` |
| `src/domain/worldSyncPipeline.ts` | `WorldSyncPipeline.swift` |
| `src/integrations/localStore.ts` | `MemoryLibraryRepository.swift` |
| Tauri `import_media_files` bridge | Swift-native import pipeline, ready to merge with `MemoryMapSidecarCore` |
