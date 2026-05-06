# Memory Map

Memory Map is now a native macOS SwiftUI app.

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

## Build App Bundle

```bash
cd native/MemoryMapNative
scripts/build-native-app.sh
open ".build/app/Memory Map.app"
```

## Architecture

- `MemoryMapNative`: SwiftUI macOS app.
- `MemoryMapNativeCore`: testable domain, import, world sync, Hermes, Amap, and export logic.
- `MemoryMapSidecarCore`: reusable native media storage, thumbnails, EXIF, and SQLite-backed import.

## Migration Status

The previous React/Vite/Tauri implementation has been replaced by the native SwiftUI app in `native/MemoryMapNative`.
