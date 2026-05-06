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
        let capturedAt = ISO8601DateFormatter().date(from: item.capturedAt) ?? Date(timeIntervalSince1970: 0)
        return MemoryItem(
            id: item.id,
            type: MemoryItemType(rawValue: item.type) ?? .note,
            title: item.title,
            summary: item.summary,
            city: item.city,
            capturedAt: capturedAt,
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
