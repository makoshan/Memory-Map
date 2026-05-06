import Foundation

public enum HermesGatewayStatus: String, Codable, Equatable, Sendable {
    case offline
    case sent
    case failed
}

public struct HermesAnalysisJob: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let mediaID: String
    public let jobType: String
    public let inputSummary: String
    public let outputJSON: String?
    public let gatewayStatus: HermesGatewayStatus
    public let createdAt: Date
    public let completedAt: Date?
    public let error: String?

    public static func offlineReady(mediaID: String, summary: String, createdAt: Date = Date(timeIntervalSince1970: 0)) -> HermesAnalysisJob {
        HermesAnalysisJob(
            id: "job-\(mediaID)",
            mediaID: mediaID,
            jobType: "media-analysis",
            inputSummary: summary,
            outputJSON: nil,
            gatewayStatus: .offline,
            createdAt: createdAt,
            completedAt: nil,
            error: nil
        )
    }

    public var succeededForWorldSync: Bool {
        gatewayStatus == .sent
    }
}

public struct MemoryLibrarySnapshot: Codable, Equatable, Sendable {
    public let memories: [MemoryItem]
    public let hermesJobs: [HermesAnalysisJob]
    public let worldExported: Bool

    public static let empty = MemoryLibrarySnapshot(memories: [], hermesJobs: [], worldExported: false)

    public init(memories: [MemoryItem], hermesJobs: [HermesAnalysisJob], worldExported: Bool) {
        self.memories = memories
        self.hermesJobs = hermesJobs
        self.worldExported = worldExported
    }
}

public struct MemoryLibraryRepository {
    private let rootDirectory: URL
    private let fileManager: FileManager

    public init(rootDirectory: URL, fileManager: FileManager = .default) {
        self.rootDirectory = rootDirectory
        self.fileManager = fileManager
    }

    public func load(fallback: MemoryLibrarySnapshot) throws -> MemoryLibrarySnapshot {
        let url = rootDirectory.appending(path: "library.json")
        guard fileManager.fileExists(atPath: url.path) else {
            return fallback
        }
        let data = try Data(contentsOf: url)
        return try decoder.decode(MemoryLibrarySnapshot.self, from: data)
    }

    public func save(_ snapshot: MemoryLibrarySnapshot) throws {
        try fileManager.createDirectory(at: rootDirectory, withIntermediateDirectories: true)
        let data = try encoder.encode(snapshot)
        try data.write(to: rootDirectory.appending(path: "library.json"), options: [.atomic])
    }

    private var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    private var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
