import Foundation

public enum ExifReadStatus: String, Codable, Sendable {
    case empty
    case reading
    case found
    case missing
    case unsupported
    case failed
}

public enum ImportProgressStepState: String, Codable, Equatable, Sendable {
    case done
    case active
    case warning
    case pending
}

public struct ImportProgressStep: Identifiable, Codable, Equatable, Sendable {
    public var id: String { label }
    public let label: String
    public let detail: String
    public let state: ImportProgressStepState
}

public enum ImportProgressBuilder {
    public static func imageSteps(
        hasImage: Bool,
        hasGpsEvidence: Bool,
        exifStatus: ExifReadStatus,
        meaningGenerated: Bool
    ) -> [ImportProgressStep] {
        [
            ImportProgressStep(
                label: "选择图片",
                detail: hasImage ? "图片已载入本地工作台" : "等待单张 HEIC / JPEG 图片",
                state: hasImage ? .done : .active
            ),
            ImportProgressStep(
                label: "读取证据",
                detail: gpsEvidenceDetail(hasImage: hasImage, hasGpsEvidence: hasGpsEvidence, exifStatus: exifStatus),
                state: hasGpsEvidence ? .done : exifStatus == .reading ? .active : hasImage ? .warning : .pending
            ),
            ImportProgressStep(
                label: "生成信息",
                detail: meaningGenerated
                    ? "已生成事件草稿"
                    : hasImage && !hasGpsEvidence
                    ? "等待补充证据后生成"
                    : hasImage
                    ? "根据文件名和证据生成"
                    : "等待图片信息",
                state: meaningGenerated ? .done : hasImage && hasGpsEvidence ? .active : .pending
            ),
            ImportProgressStep(
                label: "同步世界",
                detail: meaningGenerated ? "等待地点画像达到 10 张阈值" : "等待 EventMeaning 生成后进入聚合",
                state: .pending
            )
        ]
    }

    private static func gpsEvidenceDetail(hasImage: Bool, hasGpsEvidence: Bool, exifStatus: ExifReadStatus) -> String {
        if hasGpsEvidence { return "EXIF GPS 已确认" }
        if exifStatus == .reading { return "正在读取 EXIF" }
        if hasImage { return "未得到可用 GPS，等待补充证据" }
        return "等待图片后读取 EXIF"
    }
}

public struct NativeFileFact: Equatable, Sendable {
    public let path: String
    public let name: String
    public let size: Int64
    public let modifiedAt: Date
    public let noteText: String?

    public init(path: String, name: String, size: Int64, modifiedAt: Date, noteText: String? = nil) {
        self.path = path
        self.name = name
        self.size = size
        self.modifiedAt = modifiedAt
        self.noteText = noteText
    }
}

public struct ImportedDuplicate: Equatable, Sendable {
    public let fileName: String
    public let existingID: String
}

public struct MemoryImportResult: Equatable, Sendable {
    public let items: [MemoryItem]
    public let duplicates: [ImportedDuplicate]
}

public struct MemoryImportPipeline: Sendable {
    private let now: @Sendable () -> Date

    public init(now: @escaping @Sendable () -> Date = Date.init) {
        self.now = now
    }

    public func importFacts(_ facts: [NativeFileFact], existing: [MemoryItem]) -> MemoryImportResult {
        var imported: [MemoryItem] = []
        var duplicates: [ImportedDuplicate] = []
        var seen = existing

        for (index, fact) in facts.enumerated() {
            let type = MemoryInference.type(for: URL(fileURLWithPath: fact.name))
            if let duplicate = findDuplicate(in: seen, name: fact.name, size: fact.size, type: type) {
                duplicates.append(ImportedDuplicate(fileName: fact.name, existingID: duplicate.id))
                continue
            }

            let city = MemoryInference.detectCity(in: "\(fact.name) \(fact.noteText ?? "")")
            let title = fact.noteText.flatMap { MemoryInference.title(fromNote: $0) }
                ?? MemoryInference.title(for: URL(fileURLWithPath: fact.name))
            let text = fact.noteText ?? fact.name
            let summary = fact.noteText.map(MemoryInference.shortPreview) ?? "\(city.map { "\($0) · " } ?? "")本机导入 · \(type.displayName)"
            let item = MemoryItem(
                id: "mem-native-\(Int(now().timeIntervalSince1970))-\(index)",
                type: type,
                title: title,
                summary: summary,
                city: city,
                capturedAt: fact.modifiedAt,
                topics: MemoryInference.topics(for: type, text: text),
                fileName: fact.name,
                fileSize: fact.size,
                thumbnailPath: type == .image ? fact.path : nil
            )
            imported.append(item)
            seen.append(item)
        }

        return MemoryImportResult(items: imported, duplicates: duplicates)
    }

    public func mergeImportedItems(_ items: [MemoryItem], existing: [MemoryItem]) -> MemoryImportResult {
        var imported: [MemoryItem] = []
        var duplicates: [ImportedDuplicate] = []
        var seen = existing

        for item in items {
            if let duplicate = findDuplicate(in: seen, name: item.fileName, size: item.fileSize, type: item.type) {
                duplicates.append(ImportedDuplicate(fileName: item.fileName, existingID: duplicate.id))
                continue
            }
            imported.append(item)
            seen.append(item)
        }

        return MemoryImportResult(items: imported, duplicates: duplicates)
    }

    private func findDuplicate(in items: [MemoryItem], name: String, size: Int64, type: MemoryItemType) -> MemoryItem? {
        let normalized = name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return items.first { item in
            item.type == type &&
            item.fileSize == size &&
            item.fileName.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == normalized
        }
    }
}

private extension MemoryItemType {
    var displayName: String {
        switch self {
        case .image: "图片"
        case .audio: "音频"
        case .note: "笔记"
        }
    }
}
