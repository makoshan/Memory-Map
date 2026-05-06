import XCTest
@testable import MemoryMapNativeCore

final class WorldSnapshotTests: XCTestCase {
    func testCreatesProfilesNodesUnlocksAndOpportunities() {
        let place = Place(
            id: "place-office",
            name: "杭州办公室",
            lat: 30.2,
            lng: 120.1,
            poiType: .office,
            admin: PlaceAdmin(city: "杭州", district: "西湖区"),
            env: PlaceEnvironment(humidity: 62, temp: 24, aqi: 28, noiseEstimate: nil)
        )
        let events = [
            EventRecord(id: "event-1", placeId: "place-office", startTime: "2026-05-06T09:00:00Z", endTime: "2026-05-06T10:30:00Z", tags: [.work], steps: 1200, mediaCount: 2, amount: nil, intensity: 0.5, valence: 0.6),
            EventRecord(id: "event-2", placeId: "place-office", startTime: "2026-05-06T14:00:00Z", endTime: "2026-05-06T15:00:00Z", tags: [.work], steps: 800, mediaCount: 2, amount: nil, intensity: 0.6, valence: 0.7)
        ]

        let snapshot = WorldSnapshot.create(
            places: [place],
            events: events,
            mediaAssets: [],
            userID: "user-1",
            timeline: [WorldTimelineEntry(year: "2026", title: "Native", note: "SwiftUI")],
            generatedAt: "2026-05-06T00:00:00Z"
        )

        XCTAssertEqual(snapshot.profiles.first?.role, .work)
        XCTAssertEqual(snapshot.worldNodes.first?.nodeType, "办公室")
        XCTAssertTrue(snapshot.unlocks.contains { $0.unlockKey == "building-upgrade" })
        XCTAssertTrue(snapshot.opportunities.contains { $0.type == .work })
        XCTAssertEqual(snapshot.godotWorldState.bridge.appShell, "native-swiftui")
    }
}
