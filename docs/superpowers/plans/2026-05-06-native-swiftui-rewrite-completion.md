# Native SwiftUI Rewrite Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the full SwiftUI native macOS rewrite so the React/Vite/Tauri stack can be removed without losing current app behavior.

**Architecture:** Keep `native/MemoryMapNative` as the new app root. Move all portable logic into `MemoryMapNativeCore`, reuse `MemoryMapSidecarCore` for durable media import, and make SwiftUI views thin renderers over testable native services. Remove React/Tauri only after native tests, native build, and repository references prove the old stack is unused.

**Tech Stack:** Swift 6, SwiftUI, AppKit, SwiftPM, XCTest, `MemoryMapSidecarCore`, ImageIO/CoreGraphics, Foundation networking, JSON file persistence, optional SQLite through the existing sidecar core.

---

## File Structure

- Create `native/MemoryMapNative/Sources/MemoryMapNative/App/MemoryMapNativeApp.swift`: SwiftUI `@main` entry, app commands, window configuration.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/App/MemoryMapStore.swift`: main observable app state, import orchestration, persistence calls.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/App/NativeAsset.swift`: repository asset lookup and future bundle asset lookup.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/Design/Theme.swift`: native color, typography, surface, and card helpers.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/Views/RootView.swift`: `NavigationSplitView` shell.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/Views/WorldDashboard.swift`: world map, city state, world sync rail.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/Views/OfficeDashboard.swift`: office hero, tasks, employees, projects, monthly metrics.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/Views/MemoryDashboard.swift`: memory room hero, import CTA, memory grid, city distribution, Hermes status.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/Views/ImportDashboard.swift`: media import workbench, progress steps, evidence panels, image meaning panels.
- Create `native/MemoryMapNative/Sources/MemoryMapNative/Views/SharedCards.swift`: reusable cards, stat lists, progress rows, status pills.
- Modify `native/MemoryMapNative/Sources/MemoryMapNative/main.swift`: shrink to a compatibility shim or delete after the new app files compile.
- Modify `native/MemoryMapNative/Package.swift`: add dependency on `../MemoryMapSidecar`, add resources if assets are bundled, keep `MemoryMapNativeCore` testable.
- Create `native/MemoryMapNative/Sources/MemoryMapNativeCore/NativeMediaImporter.swift`: adapter around `MemoryMapSidecarCore.MediaImportService`.
- Create `native/MemoryMapNative/Sources/MemoryMapNativeCore/EventMeaning.swift`: Swift port of `src/domain/eventMeaning.ts`.
- Create `native/MemoryMapNative/Sources/MemoryMapNativeCore/AmapGeocoder.swift`: Swift port of `src/integrations/amapGeocoder.ts`.
- Create `native/MemoryMapNative/Sources/MemoryMapNativeCore/HermesClient.swift`: Swift port of Hermes request/payload/response behavior.
- Create `native/MemoryMapNative/Sources/MemoryMapNativeCore/ImageInlineData.swift`: Swift replacement for browser `FileReader`/canvas inline image preparation.
- Create `native/MemoryMapNative/Sources/MemoryMapNativeCore/GodotWorldState.swift`: Swift port of `src/integrations/godotWorldState.ts`.
- Modify `native/MemoryMapNative/Sources/MemoryMapNativeCore/MemoryModels.swift`: add missing domain types from `src/domain/types.ts`.
- Modify `native/MemoryMapNative/Sources/MemoryMapNativeCore/ImportPipeline.swift`: delegate file import to sidecar-backed native importer and keep duplicate detection.
- Modify `native/MemoryMapNative/Sources/MemoryMapNativeCore/MemoryLibraryRepository.swift`: store complete native snapshot, including media assets, events, Hermes jobs, world nodes, and settings.
- Create `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/EventMeaningTests.swift`.
- Create `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/AmapGeocoderTests.swift`.
- Create `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/HermesClientTests.swift`.
- Create `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/NativeMediaImporterTests.swift`.
- Create `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/GodotWorldStateTests.swift`.
- Create `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/RepositoryMigrationTests.swift`.
- Create `native/MemoryMapNative/scripts/build-native-app.sh`: deterministic `.app` build script.
- Modify `native/MemoryMapNative/README.md`: final run/build/test instructions and migration notes.
- Modify root `README.md` or create it if missing: point contributors to the SwiftUI app.
- Delete after parity is verified: `src/`, `src-tauri/`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`.

## Task 1: Checkpoint Current Native Baseline

**Files:**
- Modify: `.gitignore`
- Track: `native/MemoryMapNative/**`
- Track: `docs/superpowers/plans/2026-05-06-native-swiftui-rewrite-completion.md`

- [ ] **Step 1: Verify ignored build output**

Run:

```bash
git check-ignore -q native/MemoryMapNative/.build/ && echo ignored
```

Expected: prints `ignored`.

- [ ] **Step 2: Add temporary generated directories to ignore if they are local artifacts**

Edit `.gitignore` so it contains these lines:

```gitignore
node_modules/
outputs/
native/**/.build/
```

Expected: `git status --short` no longer shows `node_modules` or `outputs` if they are generated locally.

- [ ] **Step 3: Run baseline verification**

Run:

```bash
cd native/MemoryMapNative
swift test
swift build
```

Expected: `7 tests, 0 failures` and `Build complete`.

- [ ] **Step 4: Commit the current native baseline**

Run:

```bash
git add .gitignore native/MemoryMapNative docs/superpowers/plans/2026-05-06-native-swiftui-rewrite-completion.md
git commit -m "feat: add native SwiftUI rewrite baseline"
```

Expected: one commit on `native-swiftui-rewrite` containing the current SwiftUI package and this plan.

## Task 2: Split The SwiftUI App Into Focused Files

**Files:**
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/App/MemoryMapNativeApp.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/App/MemoryMapStore.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/App/AppSection.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/App/NativeAsset.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/Design/Theme.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/Views/RootView.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/Views/WorldDashboard.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/Views/OfficeDashboard.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/Views/MemoryDashboard.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/Views/ImportDashboard.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNative/Views/SharedCards.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/main.swift`

- [ ] **Step 1: Move app entry code**

Create `App/MemoryMapNativeApp.swift` with:

```swift
import SwiftUI

@main
struct MemoryMapNativeApp: App {
    @StateObject private var store = MemoryMapStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .frame(minWidth: 1120, minHeight: 760)
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(after: .newItem) {
                Button("导入记忆...") {
                    store.presentImportPanel()
                }
                .keyboardShortcut("i", modifiers: [.command, .shift])
            }
        }
    }
}
```

- [ ] **Step 2: Move section enum**

Create `App/AppSection.swift` with:

```swift
import Foundation

enum AppSection: String, CaseIterable, Identifiable {
    case world
    case office
    case memory
    case importLab

    var id: String { rawValue }

    var title: String {
        switch self {
        case .world: "世界地图"
        case .office: "办公室"
        case .memory: "记忆馆"
        case .importLab: "导入工作台"
        }
    }

    var symbol: String {
        switch self {
        case .world: "map"
        case .office: "building.2"
        case .memory: "photo.on.rectangle"
        case .importLab: "square.and.arrow.down"
        }
    }
}
```

- [ ] **Step 3: Move store without changing behavior**

Create `App/MemoryMapStore.swift` by moving the existing `MemoryMapStore` class from `main.swift`. Keep the exact public properties and methods:

```swift
@MainActor
final class MemoryMapStore: ObservableObject {
    @Published var selection: AppSection? = .world
    @Published private(set) var memories: [MemoryItem]
    @Published private(set) var hermesJobs: [HermesAnalysisJob]
    @Published private(set) var worldExported: Bool
    @Published private(set) var importMessage: String
    @Published private(set) var lastImportSteps: [ImportProgressStep]

    func presentImportPanel()
    func importFiles(_ urls: [URL])
    func markWorldExported()
}
```

Expected: no behavior changes; this is file movement only.

- [ ] **Step 4: Move views into view files**

Move each existing view struct from `main.swift` into the matching file:

```text
RootView, Sidebar -> Views/RootView.swift
WorldDashboard, WorldMapCard, WorldSpotView, SummaryGrid -> Views/WorldDashboard.swift
OfficeDashboard, TaskPanel, ProjectPanel -> Views/OfficeDashboard.swift
MemoryDashboard, MemoryGrid, MemoryTile, ImportCard, HermesStatusCard -> Views/MemoryDashboard.swift
ImportDashboard, ImportProgressCard -> Views/ImportDashboard.swift
Card, RightRail, StatListCard, UpgradeCard, StatusPill, SyncLine, HeroImageCard, MiniMetricCard -> Views/SharedCards.swift
Theme, Color(hex:) -> Design/Theme.swift
NativeAsset, AssetImage -> App/NativeAsset.swift
```

- [ ] **Step 5: Delete duplicate declarations from `main.swift`**

Replace `main.swift` with:

```swift
// Intentionally empty. The SwiftUI app entry point lives in App/MemoryMapNativeApp.swift.
```

- [ ] **Step 6: Verify split**

Run:

```bash
cd native/MemoryMapNative
swift test
swift build
```

Expected: tests pass and build completes.

- [ ] **Step 7: Commit**

Run:

```bash
git add native/MemoryMapNative/Sources/MemoryMapNative
git commit -m "refactor: split native SwiftUI app files"
```

## Task 3: Integrate Sidecar-Backed Native Media Import

**Files:**
- Modify: `native/MemoryMapNative/Package.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/NativeMediaImporter.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNativeCore/ImportPipeline.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/App/MemoryMapStore.swift`
- Create: `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/NativeMediaImporterTests.swift`

- [ ] **Step 1: Write failing importer mapping test**

Create `NativeMediaImporterTests.swift` with:

```swift
import XCTest
@testable import MemoryMapNativeCore

final class NativeMediaImporterTests: XCTestCase {
    func testMapsSidecarItemIntoNativeMemoryItem() throws {
        let item = NativeSidecarMemoryItem(
            id: "mem-native-abc",
            type: "image",
            title: "IMG 9128",
            summary: "Imported by Memory Map native sidecar",
            city: nil,
            capturedAt: "2026-05-03T16:13:13Z",
            capturedDate: "2026-05-03",
            thumbnailUrl: "memory-map://media/thumbnails/abc.jpg",
            topics: ["memory", "photo"],
            fileName: "IMG_9128.HEIC",
            fileSize: 4200000,
            filePath: "memory-map://media/originals/abc.heic",
            sha256: "abc",
            syncEvidence: NativeSidecarWorldSyncEvidence(
                placeKey: "gps:120.1234,30.1234",
                placeName: "GPS 120.1234, 30.1234",
                capturedAt: "2026-05-03T16:13:13Z",
                locationConfidence: 1,
                hermesSucceeded: false
            )
        )

        let mapped = try NativeMediaImporter.mapSidecarItem(item)

        XCTAssertEqual(mapped.id, "mem-native-abc")
        XCTAssertEqual(mapped.type, .image)
        XCTAssertEqual(mapped.fileName, "IMG_9128.HEIC")
        XCTAssertEqual(mapped.sha256, "abc")
        XCTAssertEqual(mapped.syncEvidence?.placeKey, "gps:120.1234,30.1234")
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd native/MemoryMapNative
swift test --filter NativeMediaImporterTests
```

Expected: fails because `NativeMediaImporter`, `NativeSidecarMemoryItem`, and `NativeSidecarWorldSyncEvidence` do not exist.

- [ ] **Step 3: Add local package dependency**

Modify `Package.swift`:

```swift
dependencies: [
    .package(path: "../MemoryMapSidecar")
],
targets: [
    .executableTarget(
        name: "MemoryMapNative",
        dependencies: ["MemoryMapNativeCore"]
    ),
    .target(
        name: "MemoryMapNativeCore",
        dependencies: [
            .product(name: "MemoryMapSidecarCore", package: "MemoryMapSidecar")
        ]
    )
]
```

- [ ] **Step 4: Add importer adapter**

Create `NativeMediaImporter.swift` with:

```swift
import Foundation
import MemoryMapSidecarCore

public typealias NativeSidecarMemoryItem = NativeMemoryItem
public typealias NativeSidecarWorldSyncEvidence = NativeWorldSyncEvidence

public struct NativeMediaImporter {
    private let service: MediaImportService

    public init(databaseURL: URL, mediaRootURL: URL) {
        self.service = MediaImportService(databaseURL: databaseURL, mediaRootURL: mediaRootURL)
    }

    public func importFiles(paths: [String]) throws -> [MemoryItem] {
        try service.importFiles(paths: paths).items.map(Self.mapSidecarItem)
    }

    public static func mapSidecarItem(_ item: NativeMemoryItem) throws -> MemoryItem {
        let date = ISO8601DateFormatter().date(from: item.capturedAt) ?? Date(timeIntervalSince1970: 0)
        return MemoryItem(
            id: item.id,
            type: MemoryItemType(rawValue: item.type) ?? .note,
            title: item.title,
            summary: item.summary,
            city: item.city,
            capturedAt: date,
            topics: item.topics,
            fileName: item.fileName,
            fileSize: item.fileSize,
            thumbnailPath: item.thumbnailUrl,
            filePath: item.filePath,
            sha256: item.sha256,
            syncEvidence: item.syncEvidence.map {
                WorldSyncEvidence(
                    placeKey: $0.placeKey,
                    placeName: $0.placeName,
                    capturedAt: $0.capturedAt,
                    locationConfidence: $0.locationConfidence,
                    hermesSucceeded: $0.hermesSucceeded
                )
            }
        )
    }
}
```

- [ ] **Step 5: Extend `MemoryItem` with sidecar fields**

Modify `MemoryModels.swift` so `MemoryItem` contains:

```swift
public let filePath: String?
public let sha256: String?
public let syncEvidence: WorldSyncEvidence?
```

Update the initializer with default values:

```swift
filePath: String? = nil,
sha256: String? = nil,
syncEvidence: WorldSyncEvidence? = nil
```

- [ ] **Step 6: Use importer from store**

In `MemoryMapStore.importFiles(_:)`, replace fact-only import with:

```swift
do {
    let imported = try nativeImporter.importFiles(paths: urls.map(\.path))
    let result = importPipeline.mergeImportedItems(imported, existing: memories)
    applyImportResult(result)
} catch {
    let facts = makeFacts(from: urls)
    let result = importPipeline.importFacts(facts, existing: memories)
    applyImportResult(result)
    importMessage += " sidecar 导入失败，已使用 Swift 推断回退：\(error.localizedDescription)"
}
```

Add private helpers `makeFacts(from:)` and `applyImportResult(_:)` in the same file.

- [ ] **Step 7: Run importer tests**

Run:

```bash
cd native/MemoryMapNative
swift test --filter NativeMediaImporterTests
```

Expected: pass.

- [ ] **Step 8: Run full tests**

Run:

```bash
cd native/MemoryMapNative
swift test
swift build
```

Expected: all tests pass; build completes.

- [ ] **Step 9: Commit**

Run:

```bash
git add native/MemoryMapNative native/MemoryMapSidecar
git commit -m "feat: use sidecar-backed native media import"
```

## Task 4: Port Event Meaning, Amap, And Hermes

**Files:**
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/EventMeaning.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/AmapGeocoder.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/HermesClient.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/ImageInlineData.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/App/MemoryMapStore.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/Views/ImportDashboard.swift`
- Create: `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/EventMeaningTests.swift`
- Create: `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/AmapGeocoderTests.swift`
- Create: `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/HermesClientTests.swift`

- [ ] **Step 1: Write failing event meaning test**

Create `EventMeaningTests.swift`:

```swift
import XCTest
@testable import MemoryMapNativeCore

final class EventMeaningTests: XCTestCase {
    func testCreatesRobotExpoMeaningFromHangzhouNote() {
        let meaning = EventMeaning.create(
            input: EventMeaningInput(
                mediaID: "media-1",
                capturedAt: "2026-05-03T16:13:13Z",
                gpsEvidence: nil,
                noteLocationContext: NoteLocationContext(
                    evidenceType: .noteExplicitPlace,
                    city: "杭州",
                    placeName: nil,
                    confidence: 0.6,
                    reviewState: .needsReview
                ),
                addressEvidence: nil,
                visualHints: ["photo", "robotics"],
                userNote: "杭州刘小龙展会看机器人"
            )
        )

        XCTAssertEqual(meaning.title, "杭州刘小龙展会看机器人")
        XCTAssertEqual(meaning.activity, "exhibition_visit")
        XCTAssertTrue(meaning.topics.contains("robotics"))
        XCTAssertTrue(meaning.requiresReview)
    }
}
```

- [ ] **Step 2: Run event meaning test and confirm failure**

Run:

```bash
cd native/MemoryMapNative
swift test --filter EventMeaningTests
```

Expected: fails because event meaning types do not exist.

- [ ] **Step 3: Implement event meaning port**

Create `EventMeaning.swift` with these public types:

```swift
public enum LocationEvidenceType: String, Codable, Sendable {
    case gpsExif = "gps_exif"
    case gpsTrace = "gps_trace"
    case manualPlace = "manual_place"
    case noteExplicitPlace = "note_explicit_place"
    case noteTimeContext = "note_time_context"
    case noteAddressText = "note_address_text"
}

public enum LocationReviewState: String, Codable, Sendable {
    case confirmed
    case suggested
    case needsReview = "needs_review"
    case rejected
}
```

Implement `EventMeaning.create(input:)` with the same topic, activity, title, confidence, and review behavior as `src/domain/eventMeaning.ts`.

- [ ] **Step 4: Write failing Amap parser test**

Create `AmapGeocoderTests.swift`:

```swift
import XCTest
@testable import MemoryMapNativeCore

final class AmapGeocoderTests: XCTestCase {
    func testBuildsConvertAndRegeoUrls() throws {
        let convert = try AmapGeocoder.buildConvertURL(key: "k", longitude: 120.1, latitude: 30.2)
        XCTAssertTrue(convert.absoluteString.contains("locations=120.1,30.2"))

        let regeo = try AmapGeocoder.buildRegeoURL(key: "k", amapLocation: "120.2,30.3")
        XCTAssertTrue(regeo.absoluteString.contains("location=120.2,30.3"))
    }

    func testParsesRegeoResponse() throws {
        let data = """
        {"status":"1","regeocode":{"formatted_address":"杭州市西湖区黄姑山路39号","addressComponent":{"city":"杭州市","district":"西湖区"},"pois":[{"name":"黄姑山路","type":"道路","distance":"12"}]}}
        """.data(using: .utf8)!

        let parsed = try AmapGeocoder.parseRegeo(data)

        XCTAssertEqual(parsed.formattedAddress, "杭州市西湖区黄姑山路39号")
        XCTAssertEqual(parsed.address.city, "杭州市")
        XCTAssertEqual(parsed.pois.first?.name, "黄姑山路")
    }
}
```

- [ ] **Step 5: Implement Amap geocoder**

Create `AmapGeocoder.swift` with:

```swift
public struct AmapParsedRegeo: Codable, Equatable, Sendable {
    public let formattedAddress: String
    public let address: AmapAddress
    public let pois: [AmapPoi]
}
```

Add `buildConvertURL`, `buildRegeoURL`, `parseConvert`, and `parseRegeo` matching `src/integrations/amapGeocoder.ts`.

- [ ] **Step 6: Write failing Hermes payload test**

Create `HermesClientTests.swift`:

```swift
import XCTest
@testable import MemoryMapNativeCore

final class HermesClientTests: XCTestCase {
    func testCreatesImageMeaningPayloadWithAddressAndInlineImage() throws {
        let request = HermesClient.createImageMeaningRequest(
            input: HermesImageMeaningInput(
                fileName: "IMG_9128.HEIC",
                capturedAt: "2026-05-03T16:13:13Z",
                gpsEvidence: WorldSyncEvidence(placeKey: "gps:120.1,30.2", placeName: "GPS 120.1, 30.2", capturedAt: "2026-05-03T16:13:13Z", locationConfidence: 1, hermesSucceeded: false),
                address: "杭州市西湖区黄姑山路39号",
                userNote: "杭州刘小龙展会看机器人",
                inlineImageDataURL: "data:image/jpeg;base64,abc"
            )
        )

        XCTAssertEqual(request.model, "gpt-4.1-mini")
        XCTAssertTrue(request.prompt.contains("IMG_9128.HEIC"))
        XCTAssertTrue(request.prompt.contains("Amap address"))
        XCTAssertEqual(request.imageDataURL, "data:image/jpeg;base64,abc")
    }
}
```

- [ ] **Step 7: Implement Hermes client**

Create `HermesClient.swift` with `HermesImageMeaningInput`, `HermesImageMeaningRequest`, `HermesImageMeaning`, and `HermesClient.createImageMeaningRequest(input:)`. Match the TypeScript payload shape enough that the native UI can show an offline preview and later send a network request.

- [ ] **Step 8: Add network execution behind a protocol**

Add:

```swift
public protocol HermesTransport: Sendable {
    func send(_ request: HermesImageMeaningRequest) async throws -> Data
}
```

Implement `URLSessionHermesTransport` with `URLRequest`, JSON body, and `OPENAI_API_KEY` read from `ProcessInfo.processInfo.environment`.

- [ ] **Step 9: Wire Import Dashboard**

In `ImportDashboard.swift`, show:

```swift
Text("EXIF GPS")
Text(store.lastGpsEvidenceLabel)
Text("Amap provider")
Text(store.lastAddressLabel)
Text("Hermes")
Text(store.lastHermesPreview)
```

Back these labels with `@Published private(set)` fields in `MemoryMapStore`.

- [ ] **Step 10: Verify**

Run:

```bash
cd native/MemoryMapNative
swift test --filter EventMeaningTests
swift test --filter AmapGeocoderTests
swift test --filter HermesClientTests
swift test
```

Expected: all pass.

- [ ] **Step 11: Commit**

Run:

```bash
git add native/MemoryMapNative
git commit -m "feat: port meaning geocoder and Hermes pipeline"
```

## Task 5: Port World Snapshot And Godot Export

**Files:**
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/WorldDomain.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/WorldEngine.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/WorldSnapshot.swift`
- Create: `native/MemoryMapNative/Sources/MemoryMapNativeCore/GodotWorldState.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/App/MemoryMapStore.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/Views/WorldDashboard.swift`
- Create: `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/GodotWorldStateTests.swift`
- Create: `native/MemoryMapNative/Tests/MemoryMapNativeCoreTests/WorldSnapshotTests.swift`

- [ ] **Step 1: Write failing Godot state test**

Create `GodotWorldStateTests.swift`:

```swift
import XCTest
@testable import MemoryMapNativeCore

final class GodotWorldStateTests: XCTestCase {
    func testCreatesNativeSwiftUIGodotBridgePayload() {
        let state = GodotWorldState.create(
            input: GodotWorldStateInput(
                memories: SampleWorld.memories,
                worldSpots: SampleWorld.spots,
                generatedAt: "2026-05-06T00:00:00Z"
            )
        )

        XCTAssertEqual(state.bridge.appShell, "native-swiftui")
        XCTAssertEqual(state.bridge.gameLayer, "godot-4.6")
        XCTAssertGreaterThan(state.nodes.count, 0)
        XCTAssertFalse(String(data: try! JSONEncoder().encode(state), encoding: .utf8)!.contains("IMG_9128.HEIC"))
    }
}
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```bash
cd native/MemoryMapNative
swift test --filter GodotWorldStateTests
```

Expected: fails because Godot types do not exist.

- [ ] **Step 3: Implement world domain types**

Create `WorldDomain.swift` with Swift equivalents of `Place`, `EventRecord`, `MediaAsset`, `PlaceProfile`, `WorldNode`, `GameUnlock`, and `Opportunity` from `src/domain/types.ts`.

- [ ] **Step 4: Implement Godot state**

Create `GodotWorldState.swift` with:

```swift
public struct GodotWorldState: Codable, Equatable, Sendable {
    public let version: String
    public let generatedAt: String
    public let bridge: GodotBridge
    public let nodes: [GodotWorldNode]
    public let ai: GodotAiSummary
}
```

Set `bridge.appShell` to `native-swiftui` and keep `bridge.gameLayer` as `godot-4.6`.

- [ ] **Step 5: Add export action**

In `MemoryMapStore`, add:

```swift
func exportGodotWorldState(to url: URL) throws {
    let state = GodotWorldState.create(input: GodotWorldStateInput(memories: memories, worldSpots: SampleWorld.spots, generatedAt: ISO8601DateFormatter().string(from: Date())))
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    try encoder.encode(state).write(to: url, options: [.atomic])
    worldExported = true
    persist()
}
```

- [ ] **Step 6: Add native export button**

In `WorldDashboard.swift`, replace the marker-only export button with `NSSavePanel`:

```swift
let panel = NSSavePanel()
panel.nameFieldStringValue = "world_state.json"
if panel.runModal() == .OK, let url = panel.url {
    try? store.exportGodotWorldState(to: url)
}
```

- [ ] **Step 7: Verify**

Run:

```bash
cd native/MemoryMapNative
swift test --filter GodotWorldStateTests
swift test
swift build
```

Expected: all pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add native/MemoryMapNative
git commit -m "feat: port native Godot world export"
```

## Task 6: Reach UI Parity For World, Office, Memory, Import

**Files:**
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/Views/WorldDashboard.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/Views/OfficeDashboard.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/Views/MemoryDashboard.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/Views/ImportDashboard.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/Views/SharedCards.swift`
- Modify: `native/MemoryMapNative/Sources/MemoryMapNative/Design/Theme.swift`
- Modify: `native/MemoryMapNative/README.md`

- [ ] **Step 1: Add Office employee panel**

In `OfficeDashboard.swift`, add:

```swift
struct EmployeePanel: View {
    private let employees = [
        ("Emma", "研究员", "项目研究", "public/assets/game/sprites/agent-researcher.png", true),
        ("Lily", "设计师", "界面设计", "public/assets/game/sprites/agent-designer.png", true),
        ("Max", "分析师", "数据分析", "public/assets/game/sprites/agent-analyst.png", true),
        ("David", "数据师", "数据处理", "public/assets/game/sprites/agent-data.png", false),
        ("Kate", "助理", "设计支持", "public/assets/game/sprites/agent-assistant.png", true),
        ("Bot-01", "执行助手", "执行中", "public/assets/game/sprites/agent-bot.png", true)
    ]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("AI 员工").font(.headline)
                    Spacer()
                    Text("6 / 6").font(.caption).foregroundStyle(Theme.subText)
                }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(employees, id: \.0) { employee in
                        HStack(spacing: 10) {
                            AssetImage(employee.3).frame(width: 42, height: 42)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(employee.0).font(.caption.bold())
                                Text(employee.1).font(.caption2).foregroundStyle(Theme.subText)
                                Text(employee.2).font(.caption2).foregroundStyle(Theme.subText)
                            }
                            Spacer()
                            Circle().fill(employee.4 ? Theme.success : Theme.warning).frame(width: 8, height: 8)
                        }
                        .padding(8)
                        .background(Theme.soft, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            }
        }
    }
}
```

Place `EmployeePanel()` beside `TaskPanel()` and `ProjectPanel()`.

- [ ] **Step 2: Add monthly metrics panel**

In `OfficeDashboard.swift`, add `MonthlyPanel` with the same KPIs as React:

```swift
private let kpis = [
    ("收入 (CNY)", "¥ 2,568,700", "+12.5%"),
    ("项目完成", "18", "+20%"),
    ("专注时长", "136h", "+15%")
]
```

Render a native `Chart` only if Charts is available; otherwise render a simple SwiftUI `Path` line. Use the existing `chartPoints` values `[10, 24, 44, 36, 64, 78, 72, 58, 92, 82, 70, 68, 78]`.

- [ ] **Step 3: Add memory tabs and empty states**

In `MemoryDashboard.swift`, add city filter state:

```swift
@State private var selectedCity = "全部"
let cities = ["全部", "杭州", "深圳", "上海", "东京"]
```

Filter memory grid:

```swift
let visible = selectedCity == "全部" ? items : items.filter { $0.city == selectedCity }
```

Show empty text:

```swift
Text("还没有导入记忆。把照片或笔记拖进导入工作台，AI 会自动建卡。")
```

- [ ] **Step 4: Add import evidence panels**

In `ImportDashboard.swift`, add panels for:

```text
EXIF GPS
Amap provider
Hermes image meaning
World sync evidence
```

Each panel must display a concrete status string from `MemoryMapStore`, not static copy.

- [ ] **Step 5: Verify UI build**

Run:

```bash
cd native/MemoryMapNative
swift build
swift test
```

Expected: build complete and tests pass.

- [ ] **Step 6: Manual smoke test**

Run:

```bash
cd native/MemoryMapNative
swift run MemoryMapNative
```

Manual expected results:

```text
App opens with sidebar.
World Map shows island spots and right rail.
Office shows hero, task panel, employee panel, project panel, monthly panel.
Memory Room shows hero, memory grid, city filters, Hermes queue, world sync.
Import Lab opens file picker from button and command-shift-I.
Importing one image adds a memory card and persists after relaunch.
```

- [ ] **Step 7: Commit**

Run:

```bash
git add native/MemoryMapNative
git commit -m "feat: complete native SwiftUI UI parity"
```

## Task 7: Add Native App Bundle Build

**Files:**
- Create: `native/MemoryMapNative/scripts/build-native-app.sh`
- Create: `native/MemoryMapNative/Resources/Info.plist`
- Modify: `native/MemoryMapNative/Package.swift`
- Modify: `native/MemoryMapNative/README.md`

- [ ] **Step 1: Add Info.plist**

Create `Resources/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>MemoryMapNative</string>
  <key>CFBundleIdentifier</key>
  <string>com.memorymap.native</string>
  <key>CFBundleName</key>
  <string>Memory Map</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>14.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
```

- [ ] **Step 2: Add app bundle script**

Create `scripts/build-native-app.sh`:

```bash
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

echo "$APP_DIR"
```

- [ ] **Step 3: Make script executable**

Run:

```bash
chmod +x native/MemoryMapNative/scripts/build-native-app.sh
```

- [ ] **Step 4: Verify app bundle build**

Run:

```bash
cd native/MemoryMapNative
scripts/build-native-app.sh
test -x ".build/app/Memory Map.app/Contents/MacOS/MemoryMapNative"
```

Expected: script prints `.build/app/Memory Map.app`; `test` exits 0.

- [ ] **Step 5: Update README**

Add:

```markdown
## Build .app

```bash
cd native/MemoryMapNative
scripts/build-native-app.sh
open ".build/app/Memory Map.app"
```
```

- [ ] **Step 6: Commit**

Run:

```bash
git add native/MemoryMapNative
git commit -m "build: add native macOS app bundle"
```

## Task 8: Remove React, Vite, And Tauri Stack

**Files:**
- Delete: `src/`
- Delete: `src-tauri/`
- Delete: `package.json`
- Delete: `package-lock.json`
- Delete: `vite.config.ts`
- Delete: `tsconfig.json`
- Delete: `tsconfig.node.json`
- Delete: `index.html`
- Modify: `.gitignore`
- Modify: `README.md` or create it if missing
- Modify: `native/MemoryMapNative/README.md`

- [ ] **Step 1: Confirm native parity gates before deletion**

Run:

```bash
cd native/MemoryMapNative
swift test
swift build
scripts/build-native-app.sh
```

Expected: all commands exit 0.

- [ ] **Step 2: Search for old stack references**

Run:

```bash
rg "tauri|react|vite|tsx|localStorage|@tauri|mapbox-gl|src-tauri|npm run|package.json" .
```

Expected before deletion: references exist only in old stack files and docs that are about migration history.

- [ ] **Step 3: Delete old stack files**

Run:

```bash
rm -rf src src-tauri
rm -f package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html
```

- [ ] **Step 4: Update root README**

Create or replace root `README.md` with:

```markdown
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
```

- [ ] **Step 5: Clean `.gitignore`**

Keep Swift/native ignores:

```gitignore
.DS_Store
.env
.env.*
!.env.example
.worktrees/
native/**/.build/
native/MemoryMapNative/.build/app/
work/runs/
outputs/
__pycache__/
*.pyc
```

Remove ignores that only existed for the old Node/Tauri stack if no other tooling uses them:

```gitignore
node_modules/
dist/
src-tauri/target/
.playwright-mcp/
```

- [ ] **Step 6: Verify no old stack references remain**

Run:

```bash
rg "src-tauri|@tauri|vite|react-dom|tsx|mapbox-gl|npm run|package-lock|localStorage" .
```

Expected: no output except historical notes in the plan file. If the plan file is the only match, keep it.

- [ ] **Step 7: Verify native app after deletion**

Run:

```bash
cd native/MemoryMapNative
swift test
swift build
scripts/build-native-app.sh
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit removal**

Run:

```bash
git add -A
git commit -m "chore: remove React Vite and Tauri stack"
```

## Task 9: Final Verification And Migration Audit

**Files:**
- Modify: `native/MemoryMapNative/README.md`
- Modify: `README.md`

- [ ] **Step 1: Run final automated checks**

Run:

```bash
cd native/MemoryMapNative
swift test
swift build
scripts/build-native-app.sh
```

Expected:

```text
Executed all XCTest tests with 0 failures.
Build complete.
.build/app/Memory Map.app exists.
```

- [ ] **Step 2: Run repository audit**

Run:

```bash
git status --short --branch
rg "src-tauri|@tauri|vite|react|react-dom|tsx|package.json|npm run|localStorage|mapbox-gl" .
```

Expected: `git status` shows a clean branch after commits; `rg` returns no runtime references to the old stack.

- [ ] **Step 3: Run manual app audit**

Run:

```bash
cd native/MemoryMapNative
swift run MemoryMapNative
```

Manual checklist:

```text
Launches as a macOS SwiftUI window.
Sidebar navigation works for World Map, Office, Memory Room, Import Lab.
World Map renders image assets.
Office panels render without clipped text.
Memory Room shows sample memories and persisted imported memories.
Import Lab imports image, audio, and note files.
Duplicate imports are skipped and reported.
Hermes/Amap panels show concrete statuses.
World export writes world_state.json.
Relaunch preserves imported memory cards.
```

- [ ] **Step 4: Update final README status**

Add this section to root `README.md`:

```markdown
## Migration Status

The previous React/Vite/Tauri implementation has been replaced by the native SwiftUI app in `native/MemoryMapNative`. The old web and Tauri source trees have been removed from this branch.
```

- [ ] **Step 5: Commit final docs**

Run:

```bash
git add README.md native/MemoryMapNative/README.md
git commit -m "docs: document native SwiftUI migration"
```

- [ ] **Step 6: Summarize commit history**

Run:

```bash
git log --oneline --decorate -10
```

Expected: recent commits show baseline, refactor, import, meaning/geocoder/Hermes, Godot export, UI parity, app bundle, old-stack removal, and docs.

## Self-Review

- Spec coverage: This plan covers native SwiftUI app structure, sidecar media import, EXIF-backed import through `MemoryMapSidecarCore`, local persistence, Amap, Hermes, world sync, Godot export, UI parity, app bundle build, old-stack deletion, and final verification.
- Placeholder scan: The plan contains concrete file paths, command lines, expected outputs, and code shapes. It avoids vague implementation instructions.
- Type consistency: `MemoryItem`, `WorldSyncEvidence`, `MemoryLibrarySnapshot`, `HermesAnalysisJob`, `NativeMediaImporter`, `GodotWorldState`, and `MemoryMapStore` are named consistently across tasks.
