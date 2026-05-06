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
            fileSize: 4_200_000,
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
