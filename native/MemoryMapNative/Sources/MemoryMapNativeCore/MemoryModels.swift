import Foundation

public enum MemoryItemType: String, Codable, CaseIterable, Sendable {
    case image
    case audio
    case note
}

public struct MemoryItem: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let type: MemoryItemType
    public let title: String
    public let summary: String
    public let city: String?
    public let capturedAt: Date
    public let topics: [String]
    public let fileName: String
    public let fileSize: Int64
    public let thumbnailPath: String?
    public let filePath: String?
    public let sha256: String?
    public let syncEvidence: WorldSyncEvidence?

    public init(
        id: String,
        type: MemoryItemType,
        title: String,
        summary: String,
        city: String?,
        capturedAt: Date,
        topics: [String],
        fileName: String,
        fileSize: Int64,
        thumbnailPath: String? = nil,
        filePath: String? = nil,
        sha256: String? = nil,
        syncEvidence: WorldSyncEvidence? = nil
    ) {
        self.id = id
        self.type = type
        self.title = title
        self.summary = summary
        self.city = city
        self.capturedAt = capturedAt
        self.topics = topics
        self.fileName = fileName
        self.fileSize = fileSize
        self.thumbnailPath = thumbnailPath
        self.filePath = filePath
        self.sha256 = sha256
        self.syncEvidence = syncEvidence
    }
}

public struct CityShare: Identifiable, Equatable, Sendable {
    public var id: String { city }
    public let city: String
    public let count: Int
    public let share: Double
}

public struct WorldSpot: Identifiable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let level: String
    public let role: String
    public let assetPath: String
    public let x: Double
    public let y: Double
}

public enum MemoryInference {
    private static let knownCities: [(keys: [String], city: String)] = [
        (["杭州", "hangzhou", "hgh", "hz"], "杭州"),
        (["深圳", "shenzhen", "szx", "sz"], "深圳"),
        (["上海", "shanghai", "pvg", "sha"], "上海"),
        (["北京", "beijing", "pek", "bjs"], "北京"),
        (["东京", "tokyo", "hnd", "nrt"], "东京"),
        (["伦敦", "london", "lhr", "lon"], "伦敦"),
        (["纽约", "new york", "newyork", "nyc"], "纽约"),
        (["洛杉矶", "los angeles", "la"], "洛杉矶"),
        (["日照", "rizhao"], "日照")
    ]

    public static func detectCity(in text: String) -> String? {
        let lowercased = text.lowercased()
        return knownCities.first { entry in
            entry.keys.contains { lowercased.contains($0.lowercased()) }
        }?.city
    }

    public static func type(for url: URL) -> MemoryItemType {
        let ext = url.pathExtension.lowercased()
        if ["heic", "heif", "jpg", "jpeg", "png", "gif", "webp", "tif", "tiff"].contains(ext) {
            return .image
        }
        if ["mp3", "wav", "m4a", "aac", "flac"].contains(ext) {
            return .audio
        }
        return .note
    }

    public static func title(for url: URL) -> String {
        let stem = url.deletingPathExtension().lastPathComponent
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "-", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return stem.isEmpty ? "未命名记忆" : String(stem.prefix(32))
    }

    public static func title(fromNote note: String) -> String? {
        let clean = note.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return nil }
        return String(clean.prefix(24))
    }

    public static func shortPreview(_ text: String) -> String {
        let clean = text.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count > 60 else { return clean }
        return "\(clean.prefix(60))..."
    }

    public static func topics(for type: MemoryItemType, text: String) -> [String] {
        var topics = ["memory"]
        if type == .image { topics.append("photo") }
        if type == .audio { topics.append("audio") }
        if type == .note { topics.append("note") }
        if text.range(of: "work|office|meeting|expo|展会|会议|办公室", options: [.regularExpression, .caseInsensitive]) != nil {
            topics.append("work")
        }
        if text.range(of: "travel|trip|city|杭州|深圳|上海|北京|东京", options: [.regularExpression, .caseInsensitive]) != nil {
            topics.append("place")
        }
        return Array(Set(topics)).sorted()
    }

    public static func groupByCity(_ items: [MemoryItem]) -> [CityShare] {
        guard !items.isEmpty else { return [] }
        var counts: [String: Int] = [:]
        for item in items {
            counts[item.city ?? "未分配", default: 0] += 1
        }
        let total = Double(items.count)
        return counts
            .map { CityShare(city: $0.key, count: $0.value, share: Double($0.value) / total) }
            .sorted { lhs, rhs in
                if lhs.count == rhs.count { return lhs.city < rhs.city }
                return lhs.count > rhs.count
            }
    }
}

public enum SampleWorld {
    public static let spots: [WorldSpot] = [
        .init(id: "office", title: "办公室", level: "Lv.8", role: "创造与工作中心", assetPath: "public/assets/game/sprites/office-island.png", x: 0.23, y: 0.36),
        .init(id: "memory", title: "记忆馆", level: "Lv.7", role: "照片、笔记、音频归档", assetPath: "public/assets/game/sprites/memory-museum-island.png", x: 0.54, y: 0.28),
        .init(id: "finance", title: "财务楼", level: "Lv.6", role: "收入与资产视图", assetPath: "public/assets/game/sprites/finance-tower-island.png", x: 0.78, y: 0.47),
        .init(id: "ai", title: "AI 研究所", level: "Lv.7", role: "Hermes 与自动化", assetPath: "public/assets/game/sprites/ai-research-lab-island.png", x: 0.38, y: 0.65),
        .init(id: "home", title: "家", level: "Lv.10", role: "生活状态与恢复", assetPath: "public/assets/game/sprites/home-base-island.png", x: 0.67, y: 0.72),
        .init(id: "life", title: "生活区", level: "Lv.5", role: "健康、运动、关系", assetPath: "public/assets/game/sprites/recovery-garden-island.png", x: 0.15, y: 0.72)
    ]

    public static let memories: [MemoryItem] = [
        .init(id: "mem-sample-1", type: .image, title: "杭州刘小龙展会看机器人", summary: "杭州刘小龙展会 · robotics / AI hardware", city: "杭州", capturedAt: date("2026-05-03T16:13:13Z"), topics: ["robotics", "AI hardware"], fileName: "IMG_9128.HEIC", fileSize: 4_200_000),
        .init(id: "mem-sample-2", type: .image, title: "深圳科技园午后", summary: "深圳科技园 · 城市记录", city: "深圳", capturedAt: date("2026-04-20T14:02:00Z"), topics: ["memory"], fileName: "DSC_0212_szx.jpg", fileSize: 3_100_000),
        .init(id: "mem-sample-3", type: .note, title: "西湖边的早晨", summary: "雾散了之后跑了 5km，看到第一只鸟。", city: "杭州", capturedAt: date("2026-04-12T07:20:00Z"), topics: ["memory"], fileName: "西湖晨跑.md", fileSize: 612),
        .init(id: "mem-sample-4", type: .audio, title: "上海夜跑播客", summary: "外滩沿江 · 4.2 km · 32 min", city: "上海", capturedAt: date("2026-03-28T20:11:00Z"), topics: ["memory"], fileName: "shanghai_run_podcast.mp3", fileSize: 7_800_000),
        .init(id: "mem-sample-5", type: .image, title: "东京旧书店的午后", summary: "东京神保町 · 旧书 · 设计杂志", city: "东京", capturedAt: date("2026-02-14T15:48:00Z"), topics: ["design research"], fileName: "tokyo_jimbocho.jpg", fileSize: 2_600_000)
    ]

    private static func date(_ value: String) -> Date {
        ISO8601DateFormatter().date(from: value) ?? Date(timeIntervalSince1970: 0)
    }
}
