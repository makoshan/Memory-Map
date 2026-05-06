import AppKit
import MemoryMapNativeCore
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

private extension MemoryItemType {
    var displayName: String {
        switch self {
        case .image: "图片"
        case .audio: "音频"
        case .note: "笔记"
        }
    }

    var symbol: String {
        switch self {
        case .image: "photo"
        case .audio: "waveform"
        case .note: "note.text"
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        NavigationSplitView {
            Sidebar()
        } detail: {
            switch store.selection ?? .world {
            case .world:
                WorldDashboard()
            case .office:
                OfficeDashboard()
            case .memory:
                MemoryDashboard()
            case .importLab:
                ImportDashboard()
            }
        }
        .background(Theme.background)
    }
}

struct Sidebar: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Memory Map")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                Text("Native SwiftUI")
                    .font(.caption)
                    .foregroundStyle(Theme.subText)
            }
            .padding(.horizontal, 10)
            .padding(.top, 18)

            List(AppSection.allCases, selection: $store.selection) { section in
                Label(section.title, systemImage: section.symbol)
                    .font(.system(size: 14, weight: .semibold))
                    .tag(section)
            }
            .scrollContentBackground(.hidden)

            Spacer()

            Card {
                VStack(alignment: .leading, spacing: 10) {
                    Label("本机优先", systemImage: "lock.laptopcomputer")
                        .font(.headline)
                    Text("文件选择、缩略图和记忆卡生成都在 macOS 进程内完成。")
                        .font(.caption)
                        .foregroundStyle(Theme.subText)
                }
            }
        }
        .padding(16)
        .frame(minWidth: 210)
        .background(.thinMaterial)
    }
}

struct WorldDashboard: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        DashboardScaffold(title: "我的世界", subtitle: "城市 Lv.10 · Day 10,532") {
            HStack(alignment: .top, spacing: 18) {
                VStack(spacing: 18) {
                    WorldMapCard()
                    SummaryGrid()
                }
                .frame(maxWidth: .infinity)

                RightRail {
                    StatListCard(title: "城市状态", rows: [
                        ("城市", "杭州"),
                        ("等级", "Lv.10"),
                        ("精力", "75%"),
                        ("心情", "82%")
                    ])
                    WorldSyncStatusCard(status: store.worldSyncStatus, exported: store.worldExported) {
                        store.markWorldExported()
                    }
                    CityDistributionCard(rows: store.cityRows, total: store.memories.count)
                }
            }
        }
    }
}

struct WorldMapCard: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        Card {
            ZStack {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: 0xBFE9FF), Color(hex: 0xEAF4FF), Color(hex: 0x7EDB8A).opacity(0.58)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                ForEach(SampleWorld.spots) { spot in
                    WorldSpotView(spot: spot)
                        .position(x: 720 * spot.x, y: 430 * spot.y)
                }
                AssetImage("public/assets/game/sprites/player-alex.png")
                    .frame(width: 58, height: 58)
                    .position(x: 430, y: 250)
                VStack(alignment: .leading, spacing: 8) {
                    Text("一个人的 AI 公司")
                        .font(.system(size: 28, weight: .bold))
                    Text("办公室、记忆馆、财务楼和 AI 研究所都变成原生 SwiftUI 可导航空间。")
                        .font(.subheadline)
                        .foregroundStyle(Theme.subText)
                }
                .padding(18)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .position(x: 210, y: 82)
            }
            .frame(height: 430)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
    }
}

struct WorldSpotView: View {
    let spot: WorldSpot

    var body: some View {
        VStack(spacing: 4) {
            AssetImage(spot.assetPath)
                .frame(width: 108, height: 82)
            HStack(spacing: 5) {
                Text(spot.title)
                    .font(.system(size: 12, weight: .bold))
                Text(spot.level)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.primary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(.regularMaterial, in: Capsule())
        }
        .help(spot.role)
    }
}

struct SummaryGrid: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: 4), spacing: 14) {
            MiniMetricCard(title: "今日任务", value: "2/4", caption: "已完成", asset: "public/assets/ai-company/daily.png")
            MiniMetricCard(title: "办公室", value: "125%", caption: "当前效率", asset: "public/assets/ai-company/office.png")
            MiniMetricCard(title: "记忆馆", value: "\(store.memories.count)", caption: "本地记忆", asset: "public/assets/ai-company/memory.png")
            MiniMetricCard(title: "财务楼", value: "¥2.56M", caption: "总资产", asset: "public/assets/ai-company/finance.png")
        }
    }
}

struct MiniMetricCard: View {
    let title: String
    let value: String
    let caption: String
    let asset: String

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.headline)
                AssetImage(asset)
                    .frame(height: 78)
                    .frame(maxWidth: .infinity)
                Text(value)
                    .font(.system(size: 24, weight: .bold))
                Text(caption)
                    .font(.caption)
                    .foregroundStyle(Theme.subText)
            }
        }
    }
}

struct OfficeDashboard: View {
    var body: some View {
        DashboardScaffold(title: "办公室", subtitle: "Lv.8 · AI 员工与你一起推动项目") {
            HStack(alignment: .top, spacing: 18) {
                VStack(spacing: 18) {
                    HeroImageCard(asset: "public/assets/office-room/office_scene.jpg", title: "创造与工作的中心", progress: 0.65)
                    HStack(spacing: 14) {
                        TaskPanel()
                        ProjectPanel()
                    }
                }
                RightRail {
                    StatListCard(title: "建筑属性", rows: [
                        ("面积", "850 m2"),
                        ("员工", "6 / 6"),
                        ("效率", "125%"),
                        ("维护费用", "320 / 天")
                    ])
                    UpgradeCard(title: "下一等级", value: "Lv.9", bullets: ["面积 +100", "效率 +15%", "员工上限 +1"])
                }
            }
        }
    }
}

struct MemoryDashboard: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        DashboardScaffold(title: "记忆馆", subtitle: "Lv.7 · 照片、笔记和音频回到城市地图") {
            HStack(alignment: .top, spacing: 18) {
                VStack(spacing: 18) {
                    HeroImageCard(asset: "public/assets/memory-room/scene.jpg", title: "记忆馆", progress: 0.70)
                    MemoryGrid(items: store.memories)
                }
                RightRail {
                    ImportCard()
                    HermesStatusCard(jobs: store.hermesJobs)
                    WorldSyncStatusCard(status: store.worldSyncStatus, exported: store.worldExported) {
                        store.markWorldExported()
                    }
                    CityDistributionCard(rows: store.cityRows, total: store.memories.count)
                    MemorySummaryCard(items: store.memories)
                }
            }
        }
    }
}

struct ImportDashboard: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        DashboardScaffold(title: "导入工作台", subtitle: "Native file picker · local inference · Swift state") {
            VStack(alignment: .leading, spacing: 18) {
                Card {
                    HStack(spacing: 18) {
                        Image(systemName: "square.and.arrow.down.on.square")
                            .font(.system(size: 44, weight: .medium))
                            .foregroundStyle(Theme.primary)
                        VStack(alignment: .leading, spacing: 8) {
                            Text("选择文件，生成本机记忆卡")
                                .font(.title2.bold())
                            Text(store.importMessage)
                                .foregroundStyle(Theme.subText)
                        }
                        Spacer()
                        Button {
                            store.presentImportPanel()
                        } label: {
                            Label("导入文件", systemImage: "plus")
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                    }
                }
                ImportProgressCard(steps: store.lastImportSteps)
                MemoryGrid(items: store.memories)
            }
        }
    }
}

struct ImportProgressCard: View {
    let steps: [ImportProgressStep]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                Text("导入流程")
                    .font(.headline)
                HStack(spacing: 12) {
                    ForEach(steps) { step in
                        VStack(alignment: .leading, spacing: 8) {
                            Image(systemName: symbol(for: step.state))
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(color(for: step.state))
                            Text(step.label)
                                .font(.system(size: 13, weight: .bold))
                            Text(step.detail)
                                .font(.caption)
                                .foregroundStyle(Theme.subText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Theme.soft, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }
            }
        }
    }

    private func symbol(for state: ImportProgressStepState) -> String {
        switch state {
        case .done: "checkmark.circle.fill"
        case .active: "arrow.triangle.2.circlepath.circle.fill"
        case .warning: "exclamationmark.triangle.fill"
        case .pending: "circle.dashed"
        }
    }

    private func color(for state: ImportProgressStepState) -> Color {
        switch state {
        case .done: Theme.success
        case .active: Theme.primary
        case .warning: Theme.warning
        case .pending: Theme.muted
        }
    }
}

struct HermesStatusCard: View {
    let jobs: [HermesAnalysisJob]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label("Hermes 队列", systemImage: "sparkles")
                        .font(.headline)
                    Spacer()
                    Text("\(jobs.count)")
                        .font(.caption.bold())
                        .foregroundStyle(Theme.subText)
                }
                Text(jobs.isEmpty ? "导入后会生成离线就绪的媒体分析任务。" : "最近任务：\(jobs.prefix(3).map(\.inputSummary).joined(separator: " / "))")
                    .font(.caption)
                    .foregroundStyle(Theme.subText)
                    .lineLimit(4)
                HStack {
                    StatusPill(title: "离线", value: jobs.filter { $0.gatewayStatus == .offline }.count, color: Theme.warning)
                    StatusPill(title: "已发", value: jobs.filter { $0.gatewayStatus == .sent }.count, color: Theme.success)
                }
            }
        }
    }
}

struct StatusPill: View {
    let title: String
    let value: Int
    let color: Color

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(color)
                .frame(width: 7, height: 7)
            Text("\(title) \(value)")
                .font(.caption2.bold())
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(Theme.soft, in: Capsule())
    }
}

struct WorldSyncStatusCard: View {
    let status: WorldSyncStatus
    let exported: Bool
    let onExport: () -> Void

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label("世界同步", systemImage: "point.3.connected.trianglepath.dotted")
                        .font(.headline)
                    Spacer()
                    Image(systemName: status.readyForPlaceProfile ? "checkmark.seal.fill" : "clock")
                        .foregroundStyle(status.readyForPlaceProfile ? Theme.success : Theme.warning)
                }
                VStack(alignment: .leading, spacing: 8) {
                    SyncLine(title: "EventMeaning", value: status.eventMeaning)
                    SyncLine(title: "地点画像", value: status.placeProfile)
                    SyncLine(title: "Layer 3", value: status.layer3)
                    SyncLine(title: "Godot", value: status.godotWorldState)
                }
                Button {
                    onExport()
                } label: {
                    Label(exported ? "已标记导出" : "标记世界导出", systemImage: "square.and.arrow.up")
                }
                .disabled(exported)
            }
        }
    }
}

struct SyncLine: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2.bold())
                .foregroundStyle(Theme.subText)
            Text(value)
                .font(.caption)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

struct HeroImageCard: View {
    let asset: String
    let title: String
    let progress: Double

    var body: some View {
        Card {
            ZStack(alignment: .bottomLeading) {
                AssetImage(asset)
                    .frame(height: 330)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                VStack(alignment: .leading, spacing: 10) {
                    Text(title)
                        .font(.system(size: 30, weight: .bold))
                    ProgressView(value: progress)
                        .tint(Theme.primary)
                    Text("\(Int(progress * 10_000)) / 10,000")
                        .font(.caption)
                }
                .padding(18)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .padding(18)
            }
        }
    }
}

struct TaskPanel: View {
    private let tasks = [
        ("10:00", "产品设计评审", true),
        ("14:00", "AI 研究进展同步", true),
        ("16:00", "财务月度分析", false),
        ("19:00", "运动 · 跑步 5km", false)
    ]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Text("今日任务")
                    .font(.headline)
                ForEach(tasks, id: \.1) { task in
                    HStack {
                        Text(task.0)
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(Theme.subText)
                        Text(task.1)
                        Spacer()
                        Image(systemName: task.2 ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(task.2 ? Theme.success : Theme.muted)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
    }
}

struct ProjectPanel: View {
    private let projects = [
        ("AI 产品优化项目", 0.72),
        ("用户研究分析", 0.58),
        ("数据模型训练", 0.45),
        ("市场调研报告", 0.28)
    ]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Text("项目进度")
                    .font(.headline)
                ForEach(projects, id: \.0) { project in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(project.0)
                            Spacer()
                            Text("\(Int(project.1 * 100))%")
                                .font(.caption.bold())
                        }
                        ProgressView(value: project.1)
                            .tint(Theme.primary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }
}

struct MemoryGrid: View {
    let items: [MemoryItem]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("记忆卡")
                        .font(.headline)
                    Spacer()
                    Text("\(items.count) 条")
                        .font(.caption)
                        .foregroundStyle(Theme.subText)
                }
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
                    ForEach(items.prefix(8)) { item in
                        MemoryTile(item: item)
                    }
                }
            }
        }
    }
}

struct MemoryTile: View {
    let item: MemoryItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack {
                if let thumbnailPath = item.thumbnailPath, let image = NSImage(contentsOfFile: thumbnailPath) {
                    Image(nsImage: image)
                        .resizable()
                        .scaledToFill()
                } else {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Theme.soft)
                    Image(systemName: item.type.symbol)
                        .font(.system(size: 30))
                        .foregroundStyle(Theme.primary)
                }
            }
            .frame(height: 94)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            Text(item.title)
                .font(.system(size: 13, weight: .bold))
                .lineLimit(1)
            Text("\(item.city ?? "未分配") · \(item.capturedAt.formatted(date: .numeric, time: .omitted))")
                .font(.caption)
                .foregroundStyle(Theme.subText)
            Text(item.summary)
                .font(.caption)
                .foregroundStyle(Theme.subText)
                .lineLimit(2)
        }
        .padding(10)
        .background(Theme.soft, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct ImportCard: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Label("批量导入", systemImage: "tray.and.arrow.down")
                    .font(.headline)
                Text("支持 HEIC、JPEG、PNG、音频和文本笔记。第一版先做本机推断，后续可接现有 sidecar 的 SQLite/缩略图流水线。")
                    .font(.caption)
                    .foregroundStyle(Theme.subText)
                Button {
                    store.presentImportPanel()
                } label: {
                    Label("选择文件", systemImage: "plus")
                }
            }
        }
    }
}

struct CityDistributionCard: View {
    let rows: [CityShare]
    let total: Int

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("城市分布")
                        .font(.headline)
                    Spacer()
                    Text("\(total) 条")
                        .font(.caption)
                        .foregroundStyle(Theme.subText)
                }
                ForEach(rows) { row in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack {
                            Text(row.city)
                            Spacer()
                            Text("\(row.count)")
                                .font(.caption.bold())
                        }
                        ProgressView(value: row.share)
                            .tint(Theme.primary)
                    }
                }
            }
        }
    }
}

struct MemorySummaryCard: View {
    let items: [MemoryItem]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Text("AI 总结")
                    .font(.headline)
                Text("共 \(items.count) 条记忆，覆盖 \(Set(items.compactMap(\.city)).count) 个城市。")
                Text("最近主题：" + Set(items.flatMap(\.topics)).prefix(3).joined(separator: "、"))
                    .foregroundStyle(Theme.subText)
            }
            .font(.caption)
        }
    }
}

struct StatListCard: View {
    let title: String
    let rows: [(String, String)]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Text(title)
                    .font(.headline)
                ForEach(rows, id: \.0) { row in
                    HStack {
                        Text(row.0)
                            .foregroundStyle(Theme.subText)
                        Spacer()
                        Text(row.1)
                            .fontWeight(.semibold)
                    }
                    .font(.caption)
                }
            }
        }
    }
}

struct UpgradeCard: View {
    let title: String
    let value: String
    let bullets: [String]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Text(title)
                    .font(.headline)
                Text(value)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(Theme.primary)
                ForEach(bullets, id: \.self) { bullet in
                    Label(bullet, systemImage: "sparkle")
                        .font(.caption)
                }
            }
        }
    }
}

struct DashboardScaffold<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .lastTextBaseline) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.system(size: 32, weight: .bold))
                        Text(subtitle)
                            .foregroundStyle(Theme.subText)
                    }
                    Spacer()
                }
                content
            }
            .padding(24)
        }
        .background(Theme.background)
    }
}

struct RightRail<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(spacing: 14) {
            content
        }
        .frame(width: 260)
    }
}

struct Card<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(16)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 18, y: 8)
    }
}

struct AssetImage: View {
    let relativePath: String

    init(_ relativePath: String) {
        self.relativePath = relativePath
    }

    var body: some View {
        Group {
            if let image = NativeAsset.image(relativePath) {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Theme.soft)
                    Image(systemName: "photo")
                        .foregroundStyle(Theme.muted)
                }
            }
        }
    }
}

enum NativeAsset {
    static func image(_ relativePath: String) -> NSImage? {
        for root in candidateRoots() {
            let url = root.appending(path: relativePath)
            if let image = NSImage(contentsOf: url) {
                return image
            }
        }
        return nil
    }

    private static func candidateRoots() -> [URL] {
        let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
        return [
            cwd,
            cwd.deletingLastPathComponent().deletingLastPathComponent(),
            URL(fileURLWithPath: #filePath)
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .deletingLastPathComponent()
        ]
    }
}

enum Theme {
    static let background = Color(hex: 0xF7F8FB)
    static let card = Color.white
    static let soft = Color(hex: 0xF4F7FB)
    static let primary = Color(hex: 0x1D6FD1)
    static let subText = Color(hex: 0x475569)
    static let muted = Color(hex: 0x94A3B8)
    static let border = Color(hex: 0xE2E8F0)
    static let success = Color(hex: 0x22C55E)
    static let warning = Color(hex: 0xF59E0B)
}

extension Color {
    init(hex: UInt, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: opacity
        )
    }
}
