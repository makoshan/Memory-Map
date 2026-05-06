import AppKit
import Foundation
import MemoryMapNativeCore
import SwiftUI

@MainActor
final class MemoryMapStore: ObservableObject {
    @Published var selection: AppSection? = .world
    @Published private(set) var memories: [MemoryItem]
    @Published private(set) var hermesJobs: [HermesAnalysisJob]
    @Published private(set) var worldExported: Bool
    @Published private(set) var importMessage = "原生 SwiftUI 版本已接管文件选择、类型判断、城市推断和本地状态。"
    @Published private(set) var lastImportSteps = ImportProgressBuilder.imageSteps(
        hasImage: false,
        hasGpsEvidence: false,
        exifStatus: .empty,
        meaningGenerated: false
    )
    @Published private(set) var lastGpsEvidenceLabel = "等待导入图片后读取 EXIF GPS"
    @Published private(set) var lastAddressLabel = "Amap provider 未配置，当前使用本机证据"
    @Published private(set) var lastHermesPreview = "Hermes 在线分析未开启，导入后会生成离线任务"

    private let repository: MemoryLibraryRepository
    private let importPipeline = MemoryImportPipeline()
    private let nativeImporter: NativeMediaImporter

    init() {
        let repository = MemoryLibraryRepository(rootDirectory: Self.libraryDirectory)
        self.repository = repository
        self.nativeImporter = NativeMediaImporter(
            databaseURL: Self.libraryDirectory.appending(path: "media.sqlite"),
            mediaRootURL: Self.libraryDirectory.appending(path: "Media", directoryHint: .isDirectory)
        )
        let fallback = MemoryLibrarySnapshot(memories: SampleWorld.memories, hermesJobs: [], worldExported: false)
        let snapshot = (try? repository.load(fallback: fallback)) ?? fallback
        self.memories = snapshot.memories
        self.hermesJobs = snapshot.hermesJobs
        self.worldExported = snapshot.worldExported
    }

    var cityRows: [CityShare] {
        MemoryInference.groupByCity(memories)
    }

    var worldSyncStatus: WorldSyncStatus {
        let evidence = memories.compactMap { item -> WorldSyncEvidence? in
            if let syncEvidence = item.syncEvidence {
                return syncEvidence
            }
            guard let city = item.city else { return nil }
            return WorldSyncEvidence(
                placeKey: "city:\(city)",
                placeName: city,
                capturedAt: ISO8601DateFormatter().string(from: item.capturedAt),
                locationConfidence: 0.6,
                hermesSucceeded: hermesJobs.contains { $0.mediaID == item.id && $0.succeededForWorldSync }
            )
        }
        let summary = WorldSyncPipeline.summarize(stored: evidence, worldExported: worldExported)
        return WorldSyncPipeline.evaluate(summary)
    }

    func presentImportPanel() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.prompt = "导入"
        panel.message = "选择照片、音频或笔记，Memory Map 会在本机生成记忆卡。"

        guard panel.runModal() == .OK else { return }
        importFiles(panel.urls)
    }

    func importFiles(_ urls: [URL]) {
        let result: MemoryImportResult
        do {
            let imported = try nativeImporter.importFiles(paths: urls.map(\.path))
            result = importPipeline.mergeImportedItems(imported, existing: memories)
        } catch {
            result = importPipeline.importFacts(makeFacts(from: urls), existing: memories)
            importMessage = "sidecar 导入失败，已使用 Swift 推断回退：\(error.localizedDescription)"
        }
        applyImportResult(result)
    }

    private func makeFacts(from urls: [URL]) -> [NativeFileFact] {
        let facts = urls.map { url in
            let resourceValues = try? url.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
            let type = MemoryInference.type(for: url)
            let noteText = type == .note ? try? String(contentsOf: url, encoding: .utf8) : nil
            return NativeFileFact(
                path: url.path,
                name: url.lastPathComponent,
                size: Int64(resourceValues?.fileSize ?? 0),
                modifiedAt: resourceValues?.contentModificationDate ?? Date(),
                noteText: noteText
            )
        }
        return facts
    }

    private func applyImportResult(_ result: MemoryImportResult) {
        memories.insert(contentsOf: result.items, at: 0)
        hermesJobs.insert(contentsOf: result.items.map { .offlineReady(mediaID: $0.id, summary: $0.summary, createdAt: Date()) }, at: 0)
        refreshImportProgress(for: result)
        persist()
    }

    func markWorldExported() {
        worldExported = true
        persist()
    }

    func exportGodotWorldStateWithPanel() {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "world_state.json"
        panel.message = "导出给 Godot Layer 3 使用的原生 world_state.json。"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            try exportGodotWorldState(to: url)
            importMessage = "已导出 world_state.json：\(url.lastPathComponent)"
        } catch {
            importMessage = "world_state.json 导出失败：\(error.localizedDescription)"
        }
    }

    func exportGodotWorldState(to url: URL) throws {
        let state = GodotWorldState.create(
            input: GodotWorldStateInput(
                memories: memories,
                worldSpots: SampleWorld.spots,
                generatedAt: ISO8601DateFormatter().string(from: Date())
            )
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try encoder.encode(state).write(to: url, options: [.atomic])
        worldExported = true
        persist()
    }

    private func refreshImportProgress(for result: MemoryImportResult) {
        let importedImages = result.items.filter { $0.type == .image }
        lastImportSteps = ImportProgressBuilder.imageSteps(
            hasImage: !importedImages.isEmpty,
            hasGpsEvidence: false,
            exifStatus: importedImages.isEmpty ? .empty : .missing,
            meaningGenerated: !result.items.isEmpty
        )

        if result.items.isEmpty {
            importMessage = result.duplicates.isEmpty
                ? "没有新增文件。"
                : "没有新增文件，跳过 \(result.duplicates.count) 个重复项。"
            return
        }

        let duplicateText = result.duplicates.isEmpty ? "" : "，跳过 \(result.duplicates.count) 个重复项"
        importMessage = "已导入 \(result.items.count) 条记忆\(duplicateText)，世界地图和记忆馆已刷新。"
        refreshEvidenceLabels(for: result.items)
    }

    private func refreshEvidenceLabels(for items: [MemoryItem]) {
        if let evidence = items.compactMap(\.syncEvidence).first {
            lastGpsEvidenceLabel = "\(evidence.placeName ?? evidence.placeKey) · confidence \(evidence.locationConfidence)"
        } else if items.contains(where: { $0.type == .image }) {
            lastGpsEvidenceLabel = "未得到可用 GPS，等待补充证据"
        } else {
            lastGpsEvidenceLabel = "当前导入未包含图片 EXIF GPS"
        }

        lastAddressLabel = items.compactMap(\.city).first.map { "\($0) · 来自文件名/笔记/sidecar 证据" }
            ?? "未获得城市或 Amap 地址"

        if let first = items.first {
            let request = HermesClient.createImageMeaningRequest(
                input: HermesImageMeaningInput(
                    fileName: first.fileName,
                    capturedAt: ISO8601DateFormatter().string(from: first.capturedAt),
                    gpsEvidence: first.syncEvidence,
                    address: first.city,
                    userNote: first.summary,
                    inlineImageDataURL: first.thumbnailPath ?? first.filePath ?? "memory-map://media/unavailable"
                )
            )
            lastHermesPreview = request.prompt
        } else {
            lastHermesPreview = "Hermes 在线分析未开启，导入后会生成离线任务"
        }
    }

    private func persist() {
        do {
            try repository.save(MemoryLibrarySnapshot(memories: memories, hermesJobs: hermesJobs, worldExported: worldExported))
        } catch {
            importMessage = "本机库写入失败：\(error.localizedDescription)"
        }
    }

    private static var libraryDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        return base.appending(path: "MemoryMapNative", directoryHint: .isDirectory)
    }
}
