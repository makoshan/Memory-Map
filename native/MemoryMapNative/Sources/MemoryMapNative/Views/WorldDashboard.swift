import MemoryMapNativeCore
import SwiftUI

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
                        store.exportGodotWorldStateWithPanel()
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
