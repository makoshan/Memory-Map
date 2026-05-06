import XCTest
@testable import MemoryMapNativeCore

final class ImportPipelineTests: XCTestCase {
    func testImportProgressWarnsWhenImageHasNoGpsEvidence() {
        let steps = ImportProgressBuilder.imageSteps(
            hasImage: true,
            hasGpsEvidence: false,
            exifStatus: .missing,
            meaningGenerated: false
        )

        XCTAssertEqual(steps.map(\.state), [.done, .warning, .pending, .pending])
        XCTAssertEqual(steps[1].detail, "未得到可用 GPS，等待补充证据")
    }

    func testImportPipelineDeduplicatesByTypeNameAndSize() {
        let pipeline = MemoryImportPipeline(now: { Date(timeIntervalSince1970: 1_800) })
        let existing = MemoryItem(
            id: "existing",
            type: .image,
            title: "杭州机器人展会",
            summary: "existing",
            city: "杭州",
            capturedAt: Date(timeIntervalSince1970: 1_000),
            topics: ["memory"],
            fileName: "hangzhou-robot-expo.jpg",
            fileSize: 42
        )
        let imported = pipeline.importFacts([
            .init(path: "/tmp/hangzhou-robot-expo.jpg", name: "hangzhou-robot-expo.jpg", size: 42, modifiedAt: Date(timeIntervalSince1970: 1_100)),
            .init(path: "/tmp/shenzhen-note.md", name: "shenzhen-note.md", size: 9, modifiedAt: Date(timeIntervalSince1970: 1_200), noteText: "深圳科技园午后")
        ], existing: [existing])

        XCTAssertEqual(imported.items.count, 1)
        XCTAssertEqual(imported.duplicates.map(\.fileName), ["hangzhou-robot-expo.jpg"])
        XCTAssertEqual(imported.items.first?.city, "深圳")
        XCTAssertEqual(imported.items.first?.type, .note)
        XCTAssertEqual(imported.items.first?.summary, "深圳科技园午后")
    }

    func testMemoryLibraryRepositoryPersistsMemoryItemsAndJobs() throws {
        let directory = try makeTemporaryDirectory()
        let repository = MemoryLibraryRepository(rootDirectory: directory)
        let snapshot = MemoryLibrarySnapshot(
            memories: SampleWorld.memories,
            hermesJobs: [.offlineReady(mediaID: "mem-sample-1", summary: "ready")],
            worldExported: true
        )

        try repository.save(snapshot)
        let loaded = try repository.load(fallback: .empty)

        XCTAssertEqual(loaded.memories.count, SampleWorld.memories.count)
        XCTAssertEqual(loaded.hermesJobs.first?.gatewayStatus, .offline)
        XCTAssertEqual(loaded.worldExported, true)
    }

    func testHermesOfflineJobsAreNotWorldSyncSuccesses() {
        let offline = HermesAnalysisJob.offlineReady(mediaID: "mem-sample-1", summary: "queued")
        let sent = HermesAnalysisJob(
            id: "job-sent",
            mediaID: "mem-sample-2",
            jobType: "media-analysis",
            inputSummary: "sent",
            outputJSON: "{}",
            gatewayStatus: .sent,
            createdAt: Date(timeIntervalSince1970: 1),
            completedAt: Date(timeIntervalSince1970: 2),
            error: nil
        )

        XCTAssertFalse(offline.succeededForWorldSync)
        XCTAssertTrue(sent.succeededForWorldSync)
    }

    func testWorldSyncPipelineRequiresEnoughEventsVisitsConfidenceAndHermes() {
        let records = [
            WorldSyncEvidence(placeKey: "gps:120.1234,30.1234", placeName: "杭州", capturedAt: "2026-05-01T10:00:00Z", locationConfidence: 1, hermesSucceeded: true),
            WorldSyncEvidence(placeKey: "gps:120.1234,30.1234", placeName: "杭州", capturedAt: "2026-05-01T12:00:00Z", locationConfidence: 1, hermesSucceeded: true),
            WorldSyncEvidence(placeKey: "gps:120.1234,30.1234", placeName: "杭州", capturedAt: "2026-05-02T10:00:00Z", locationConfidence: 1, hermesSucceeded: false)
        ]

        let summary = WorldSyncPipeline.summarize(stored: records)
        let status = WorldSyncPipeline.evaluate(summary, thresholds: .init(eventCount: 3, visitCount: 2, locationConfidence: 0.8, hermesSuccessCount: 2))

        XCTAssertTrue(status.readyForPlaceProfile)
        XCTAssertEqual(status.layer3, "地点画像稳定，准备生成世界建筑/区域")
    }

    private func makeTemporaryDirectory() throws -> URL {
        let url = FileManager.default.temporaryDirectory
            .appending(path: "MemoryMapNativeTests-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }
}
