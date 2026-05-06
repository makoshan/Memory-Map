import XCTest
@testable import MemoryMapNativeCore

final class GodotWorldStateTests: XCTestCase {
    func testCreatesNativeSwiftUIGodotBridgePayload() throws {
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
        let payload = String(data: try JSONEncoder().encode(state), encoding: .utf8)!
        XCTAssertFalse(payload.contains("IMG_9128.HEIC"))
    }
}
