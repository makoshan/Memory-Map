#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/.build/app/Memory Map.app"
MACOS_DIR="$APP_DIR/Contents/MacOS"
RESOURCES_DIR="$APP_DIR/Contents/Resources"

cd "$ROOT"
swift build -c release

rm -rf "$APP_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"
cp "$ROOT/.build/release/MemoryMapNative" "$MACOS_DIR/MemoryMapNative"
cp "$ROOT/Resources/Info.plist" "$APP_DIR/Contents/Info.plist"
cp -R "$ROOT/../../public" "$RESOURCES_DIR/public"

echo "$APP_DIR"
