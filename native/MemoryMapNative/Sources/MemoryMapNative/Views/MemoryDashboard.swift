import AppKit
import MemoryMapNativeCore
import SwiftUI

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
