import MemoryMapNativeCore
import SwiftUI

struct WorldDashboard: View {
    @EnvironmentObject private var store: MemoryMapStore
    private let layout = HomeDashboardLayout.designReference
    private let boardWidth: CGFloat = 1360
    private let boardHeight: CGFloat = 910

    var body: some View {
        GeometryReader { proxy in
            let scale = min(1, proxy.size.width / boardWidth)

            ScrollView(.vertical) {
                WorldDashboardBoard(
                    layout: layout,
                    memoriesCount: store.memories.count,
                    boardWidth: boardWidth
                )
                .scaleEffect(scale, anchor: .topLeading)
                .frame(width: boardWidth * scale, height: boardHeight * scale, alignment: .topLeading)
                .frame(maxWidth: .infinity, alignment: .topLeading)
            }
            .scrollIndicators(.hidden)
        }
        .background(Theme.background)
    }
}

struct WorldDashboardBoard: View {
    let layout: HomeDashboardLayout
    let memoriesCount: Int
    let boardWidth: CGFloat

    var body: some View {
        VStack(spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                VStack(spacing: 10) {
                    WorldCanvas(layout: layout)
                    BottomFocusMapRow(memoriesCount: memoriesCount, cityTabs: layout.cityTabs)
                }
                .frame(width: 730)

                ReferenceSideStack(memoriesCount: memoriesCount, layout: layout)
                    .frame(width: 620)
            }
        }
        .frame(width: boardWidth, alignment: .topLeading)
    }
}

struct WorldCanvas: View {
    let layout: HomeDashboardLayout

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: 0x63CBF3), Color(hex: 0x2EA9E0), Color(hex: 0x0878C2)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

            SkylineBackdrop()
            DecorativeClouds()
            WaterTexture()
            BridgeLayer()

            ForEach(layout.worldBuildings, id: \.title) { building in
                WorldBuildingMarker(building: building)
                    .position(x: 730 * building.x, y: 500 * building.y)
            }

            AssetImage("public/assets/game/sprites/player-alex.png")
                .frame(width: 46, height: 46)
                .background(.white.opacity(0.84), in: Circle())
                .position(x: 400, y: 320)

            WorldTopBar()
                .position(x: 438, y: 30)

            Button {
            } label: {
                Label("世界地图", systemImage: "globe.asia.australia.fill")
                    .font(.system(size: 13, weight: .bold))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 11)
                    .background(.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .buttonStyle(.plain)
            .position(x: 84, y: 465)

            TodayStatusPanel(metrics: layout.primaryStatusMetrics)
                .position(x: 620, y: 420)
        }
        .frame(width: 730, height: 500)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Theme.border, lineWidth: 1)
        )
    }
}

struct SkylineBackdrop: View {
    private let columns: [(CGFloat, CGFloat, CGFloat)] = [
        (55, 78, 0.24), (86, 118, 0.18), (128, 62, 0.20), (455, 76, 0.18),
        (487, 112, 0.16), (528, 82, 0.20), (590, 132, 0.14), (632, 92, 0.18)
    ]

    var body: some View {
        ZStack(alignment: .bottom) {
            LinearGradient(
                colors: [Color.white.opacity(0.46), Color.white.opacity(0.08)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 150)
            .position(x: 365, y: 128)

            ForEach(Array(columns.enumerated()), id: \.offset) { _, column in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(hex: 0x3D7199).opacity(column.2))
                    .frame(width: 18, height: column.1)
                    .position(x: column.0, y: 178 - column.1 / 2)
            }
        }
        .frame(width: 730, height: 220)
        .position(x: 365, y: 120)
    }
}

struct WaterTexture: View {
    var body: some View {
        ZStack {
            ForEach(0..<18, id: \.self) { index in
                Capsule()
                    .fill(Color.white.opacity(index.isMultiple(of: 3) ? 0.16 : 0.08))
                    .frame(width: CGFloat(36 + (index % 5) * 24), height: 2)
                    .position(
                        x: CGFloat(44 + (index * 47) % 650),
                        y: CGFloat(210 + (index * 29) % 250)
                    )
            }
            AssetImage("public/assets/game/sprites/lighthouse-island.png")
                .frame(width: 92, height: 76)
                .position(x: 625, y: 392)
            AssetImage("public/assets/game/sprites/reed-patch.png")
                .frame(width: 62, height: 54)
                .position(x: 318, y: 442)
            AssetImage("public/assets/game/sprites/flower-patch.png")
                .frame(width: 58, height: 48)
                .position(x: 420, y: 438)
            AssetImage("public/assets/game/sprites/wood-bridge.png")
                .frame(width: 78, height: 34)
                .rotationEffect(.degrees(-12))
                .position(x: 390, y: 336)
        }
        .frame(width: 730, height: 500)
    }
}

struct BridgeLayer: View {
    var body: some View {
        ZStack {
            BridgeSegment(width: 110, angle: -17, x: 270, y: 285)
            BridgeSegment(width: 104, angle: 20, x: 445, y: 300)
            BridgeSegment(width: 96, angle: -8, x: 560, y: 330)
        }
    }
}

struct BridgeSegment: View {
    let width: CGFloat
    let angle: Double
    let x: CGFloat
    let y: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(Color(hex: 0xA56F3A).opacity(0.82))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color(hex: 0x6B4A2A).opacity(0.65), lineWidth: 1)
            )
            .frame(width: width, height: 10)
            .rotationEffect(.degrees(angle))
            .position(x: x, y: y)
    }
}

struct DecorativeClouds: View {
    var body: some View {
        ZStack {
            CloudGroup(x: 86, y: 72, scale: 1.1)
            CloudGroup(x: 300, y: 58, scale: 0.82)
            CloudGroup(x: 627, y: 72, scale: 1.0)
            CloudGroup(x: 772, y: 116, scale: 0.72)
        }
        .opacity(0.84)
    }
}

struct CloudGroup: View {
    let x: CGFloat
    let y: CGFloat
    let scale: CGFloat

    var body: some View {
        HStack(spacing: -8) {
            Circle().frame(width: 38, height: 38)
            Circle().frame(width: 54, height: 54)
            Circle().frame(width: 34, height: 34)
        }
        .foregroundStyle(Color.white.opacity(0.82))
        .scaleEffect(scale)
        .position(x: x, y: y)
    }
}

struct WorldTopBar: View {
    var body: some View {
        HStack(spacing: 8) {
            WorldMenuPill(systemImage: "mappin.circle.fill", title: "杭州  Hangzhou", trailingImage: "chevron.down")
                .frame(width: 142)
            WorldMenuPill(systemImage: "sun.max.fill", title: "24°C   晴 · 空气优 28")
                .frame(width: 178)
            Spacer(minLength: 76)
            WorldTopIcon(systemImage: "calendar")
            WorldTopIcon(systemImage: "bell.badge")
            WorldTopIcon(systemImage: "gearshape")
            AssetImage("public/assets/game/sprites/player-alex.png")
                .frame(width: 34, height: 34)
                .background(.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .font(.system(size: 12, weight: .bold))
        .foregroundStyle(Theme.subText)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .frame(width: 565, height: 44)
        .background(.white.opacity(0.18), in: Capsule())
    }
}

struct WorldMenuPill: View {
    let systemImage: String
    let title: String
    var trailingImage: String?

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: systemImage)
                .foregroundStyle(systemImage == "sun.max.fill" ? Theme.warning : Theme.primary)
            Text(title)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            if let trailingImage {
                Spacer(minLength: 0)
                Image(systemName: trailingImage)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Theme.subText.opacity(0.7))
            }
        }
        .padding(.horizontal, 10)
        .frame(height: 32)
        .background(.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.white.opacity(0.72), lineWidth: 1)
        )
    }
}

struct WorldTopIcon: View {
    let systemImage: String

    var body: some View {
        Image(systemName: systemImage)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(Theme.subText)
            .frame(width: 34, height: 34)
            .background(.white.opacity(0.84), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct WorldBuildingMarker: View {
    let building: HomeWorldBuilding

    var body: some View {
        VStack(spacing: -4) {
            HStack(spacing: 7) {
                AssetImage(building.assetPath)
                    .frame(width: 30, height: 30)
                VStack(alignment: .leading, spacing: 1) {
                    Text(building.title)
                        .font(.system(size: 13, weight: .bold))
                    Text(building.level)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.subText)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Color.white.opacity(0.9), lineWidth: 1)
            )
            AssetImage(building.assetPath)
                .frame(width: 132, height: 104)
        }
        .shadow(color: Color.black.opacity(0.12), radius: 10, y: 7)
        .help(building.role)
    }
}

struct TodayStatusPanel: View {
    let metrics: [HomeStatusMetric]

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text("今日状态")
                .font(.system(size: 13, weight: .bold))
            ForEach(metrics, id: \.title) { metric in
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color(hex: metric.tintHex))
                        .frame(width: 8, height: 8)
                    Text(metric.title)
                        .frame(width: 34, alignment: .leading)
                    ProgressView(value: progressValue(metric.value))
                        .tint(Color(hex: metric.tintHex))
                        .frame(width: 76)
                    Text(metric.value)
                        .fontWeight(.bold)
                        .frame(width: 36, alignment: .trailing)
                    Text(metric.caption)
                        .foregroundStyle(Theme.subText)
                }
                .font(.system(size: 10, weight: .semibold))
            }
        }
        .padding(14)
        .frame(width: 205, alignment: .leading)
        .background(.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Theme.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.08), radius: 14, y: 8)
    }

    private func progressValue(_ value: String) -> Double {
        let number = value.replacingOccurrences(of: "%", with: "")
        return (Double(number) ?? 0) / 100
    }
}

struct FocusStrip: View {
    let memoriesCount: Int
    let cityTabs: [String]

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            FocusListCard()
                .frame(width: 180)
            CalendarMiniCard()
                .frame(width: 180)
            DailySummaryCard(memoriesCount: memoriesCount)
                .frame(width: 180)
            CitySwitchCard(cityTabs: cityTabs)
                .frame(width: 160)
        }
        .frame(height: 260)
    }
}

struct BottomFocusMapRow: View {
    let memoriesCount: Int
    let cityTabs: [String]

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            FocusOverviewCard(memoriesCount: memoriesCount)
                .frame(width: 410, height: 230)
            CitySwitchCard(cityTabs: cityTabs)
                .frame(width: 310, height: 230)
        }
    }
}

struct FocusOverviewCard: View {
    let memoriesCount: Int

    var body: some View {
        HomePanel(title: "5. 今日页 - 你的重点") {
            HStack(alignment: .top, spacing: 10) {
                FocusListCardContent()
                CalendarMiniContent()
                DailySummaryContent(memoriesCount: memoriesCount)
            }
        }
    }
}

struct FocusListCardContent: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text("今日重点")
                .font(.system(size: 11, weight: .bold))
            ForEach([("产品设计评审", "10:00"), ("AI 研究进展同步", "14:00"), ("财务月度分析", "16:00")], id: \.0) { item in
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.square.fill")
                        .foregroundStyle(Theme.ocean)
                    Text(item.0)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Spacer(minLength: 4)
                    Text(item.1)
                        .foregroundStyle(Theme.subText)
                }
                .font(.system(size: 9, weight: .semibold))
                .padding(.vertical, 6)
                .padding(.horizontal, 7)
                .background(Theme.soft, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
            }
            Spacer(minLength: 0)
            Button {
            } label: {
                Label("添加任务", systemImage: "plus")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.plain)
            .font(.system(size: 10, weight: .bold))
            .padding(.vertical, 8)
            .background(.white, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border))
        }
        .frame(width: 120, alignment: .topLeading)
    }
}

struct CalendarMiniContent: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("日历视图")
                    .font(.system(size: 11, weight: .bold))
                Spacer()
                Text("今天")
                    .foregroundStyle(Theme.subText)
            }
            ForEach([("10:00  产品设计评审", Theme.primaryLight), ("14:00  AI 研究进展同步", Color(hex: 0xFCE3EE)), ("16:00  财务月度分析", Color(hex: 0xFFE8B8)), ("19:00  运动 · 跑步 5km", Color(hex: 0xCFF3DF))], id: \.0) { item in
                Text(item.0)
                    .font(.system(size: 9, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 7)
                    .padding(.horizontal, 8)
                    .background(item.1, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
            }
        }
        .frame(width: 122, alignment: .topLeading)
    }
}

struct DailySummaryContent: View {
    let memoriesCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("每日总结")
                .font(.system(size: 11, weight: .bold))
            DailySummaryScene()
                .frame(height: 72)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            Text("完成 2/4 项任务")
                .font(.system(size: 10, weight: .bold))
            HStack {
                MiniStat(title: "专注", value: "6.2h")
                MiniStat(title: "记忆", value: "\(memoriesCount)")
                MiniStat(title: "完成", value: "72%")
            }
        }
        .frame(width: 122, alignment: .topLeading)
    }
}

struct FocusListCard: View {
    var body: some View {
        HomePanel(title: "5. 今日页 - 你的重点") {
            VStack(alignment: .leading, spacing: 10) {
                Text("今日重点")
                    .font(.system(size: 12, weight: .bold))
                ForEach([("产品设计评审", "10:00"), ("AI 研究进展同步", "14:00"), ("财务月度分析", "16:00")], id: \.0) { item in
                    HStack {
                        Image(systemName: "checkmark.square.fill")
                            .foregroundStyle(Theme.ocean)
                        Text(item.0)
                        Spacer()
                        Text(item.1)
                            .foregroundStyle(Theme.subText)
                    }
                    .font(.system(size: 10, weight: .semibold))
                    .padding(.vertical, 7)
                    .padding(.horizontal, 8)
                    .background(Theme.soft, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                }
                Spacer()
                Button {
                } label: {
                    Label("添加任务", systemImage: "plus")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
                .font(.system(size: 11, weight: .bold))
                .padding(.vertical, 9)
                .background(.white, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border))
            }
        }
    }
}

struct CalendarMiniCard: View {
    var body: some View {
        HomePanel(title: "日历视图") {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("2024 年 5 月 20 日 · 周一")
                    Spacer()
                    Text("今天")
                }
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Theme.subText)
                ForEach([("10:00  产品设计评审", Theme.primaryLight), ("14:00  AI 研究进展同步", Color(hex: 0xFCE3EE)), ("16:00  财务月度分析", Color(hex: 0xFFE8B8)), ("19:00  运动 · 跑步 5km", Color(hex: 0xCFF3DF))], id: \.0) { item in
                    Text(item.0)
                        .font(.system(size: 10, weight: .bold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 9)
                        .padding(.horizontal, 10)
                        .background(item.1, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                }
                Spacer()
            }
        }
    }
}

struct DailySummaryCard: View {
    let memoriesCount: Int

    var body: some View {
        HomePanel(title: "每日总结") {
            VStack(alignment: .leading, spacing: 10) {
                DailySummaryScene()
                    .frame(height: 105)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                Text("你已完成 2/4 项任务")
                    .font(.system(size: 12, weight: .bold))
                Text("继续加油，Alex！")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Theme.subText)
                HStack {
                    MiniStat(title: "专注时长", value: "6.2h")
                    MiniStat(title: "本地记忆", value: "\(memoriesCount)")
                    MiniStat(title: "完成率", value: "72%")
                }
                Spacer()
            }
        }
    }
}

struct CitySwitchCard: View {
    let cityTabs: [String]
    private let columns = [
        GridItem(.flexible(), spacing: 6),
        GridItem(.flexible(), spacing: 6)
    ]

    var body: some View {
        HomePanel(title: "6. 世界地图 - 切换城市") {
            VStack(alignment: .leading, spacing: 10) {
                StylizedWorldMapScene()
                    .frame(height: 108)
                    .frame(maxWidth: .infinity)
                    .background(
                        LinearGradient(colors: [Theme.sky, Theme.ocean.opacity(0.72)], startPoint: .top, endPoint: .bottom),
                        in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                    )
                LazyVGrid(columns: columns, spacing: 6) {
                    ForEach(cityTabs, id: \.self) { city in
                        Text(city)
                            .font(.system(size: 10, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 7)
                            .background(city == "杭州" ? Theme.primaryLight : Theme.soft, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                    }
                }
                Spacer()
            }
        }
    }
}

struct DetailRail: View {
    let memoriesCount: Int
    let layout: HomeDashboardLayout

    var body: some View {
        VStack(spacing: 10) {
            BuildingStatsCard()
            ProjectProgressCard()
            RoomPreviewCard(
                number: "2.",
                title: "进入建筑（以办公室为例）",
                asset: "scene:office"
            )
            MemoryMuseumCard(memoriesCount: memoriesCount)
            CityBrowseCard()
            FinanceRoomCard()
            AssetDonutCard()
            CityDistributionMiniCard()
        }
    }
}

struct ReferenceSideStack: View {
    let memoriesCount: Int
    let layout: HomeDashboardLayout

    var body: some View {
        VStack(spacing: 10) {
            OfficeOverviewSection()
                .frame(height: 345)
            MemoryOverviewSection(memoriesCount: memoriesCount)
                .frame(height: 190)
            FinanceOverviewSection()
                .frame(height: 165)
            LifeTimelineCard(stages: layout.lifeStages)
                .frame(height: 180)
        }
    }
}

struct OfficeOverviewSection: View {
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            RoomPreviewWideCard()
                .frame(width: 420)
            VStack(spacing: 10) {
                BuildingStatsCard()
                ProjectProgressCard()
            }
            .frame(width: 190)
        }
    }
}

struct RoomPreviewWideCard: View {
    var body: some View {
        HomePanel(title: "2. 进入建筑（以办公室为例）") {
            VStack(spacing: 10) {
                OfficeRoomScene()
                    .frame(height: 160)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                HStack(alignment: .top, spacing: 10) {
                    TaskScheduleMini()
                    AIEmployeeMini()
                }
            }
        }
    }
}

struct MemoryOverviewSection: View {
    let memoriesCount: Int

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            MemoryMuseumCard(memoriesCount: memoriesCount)
                .frame(width: 420)
            CityBrowseCard()
                .frame(width: 190)
        }
    }
}

struct FinanceOverviewSection: View {
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            FinanceRoomCard()
                .frame(width: 300)
            AssetDonutCard()
                .frame(width: 150)
            CityDistributionMiniCard()
                .frame(width: 150)
        }
    }
}

struct RoomPreviewCard: View {
    let number: String
    let title: String
    let asset: String

    var body: some View {
        HomePanel(title: "\(number) \(title)") {
            VStack(spacing: 10) {
                AssetScenePreview(asset: asset)
                    .frame(height: 126)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(spacing: 10) {
                    TaskScheduleMini()
                    AIEmployeeMini()
                }
            }
        }
    }
}

struct TaskScheduleMini: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text("今日任务")
                .font(.system(size: 12, weight: .bold))
            ForEach(["10:00  产品设计评审", "14:00  AI 研究进展同步", "16:00  财务月度分析", "19:00  运动 · 跑步 5km"], id: \.self) { item in
                Text(item)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Theme.subText)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border))
    }
}

struct AIEmployeeMini: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                Text("AI 员工")
                    .font(.system(size: 12, weight: .bold))
                Spacer()
                Text("全员成熟 6/6")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Theme.subText)
            }
            HStack {
                ForEach(["char-assistant", "char-analyst", "char-researcher", "char-female", "char-male", "char-bot"], id: \.self) { name in
                    AssetImage("public/assets/generated/v2/sprites/\(name).png")
                        .frame(width: 33, height: 33)
                }
            }
            Text("Emma · Max · Kate · Lily · David · Bot-01")
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(Theme.subText)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border))
    }
}

struct BuildingStatsCard: View {
    var body: some View {
        HomePanel(title: "办公室  Lv.8") {
            VStack(alignment: .leading, spacing: 10) {
                Text("你的核心工作空间，AI 员工与你一起工作。")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Theme.subText)
                Divider()
                StatRow(label: "面积", value: "8,500")
                StatRow(label: "员工", value: "6/6")
                StatRow(label: "效率", value: "125%", tint: Theme.success)
                StatRow(label: "记忆点", value: "1,200/2,000")
            }
        }
    }
}

struct ProjectProgressCard: View {
    var body: some View {
        HomePanel(title: "项目进度") {
            VStack(alignment: .leading, spacing: 8) {
                Text("AI 产品优化项目")
                    .font(.system(size: 11, weight: .bold))
                ProgressView(value: 0.72)
                    .tint(Color(hex: 0x49B8C4))
                Text("72%")
                    .font(.system(size: 11, weight: .bold))
                ForEach(["需求分析", "原型设计", "开发中", "测试"], id: \.self) { item in
                    Label(item, systemImage: "circle.fill")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Theme.subText)
                }
            }
        }
    }
}

struct MemoryMuseumCard: View {
    let memoriesCount: Int

    var body: some View {
        HomePanel(title: "3. 记忆馆") {
            VStack(alignment: .leading, spacing: 10) {
                MemoryGalleryScene()
                    .frame(height: 86)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                ScrollView(.horizontal) {
                    HStack(spacing: 7) {
                        ForEach(["2018", "2019", "2020", "2021", "2022", "2023", "2024"], id: \.self) { year in
                            VStack(spacing: 3) {
                                AssetImage("public/assets/imported/user-atlas/sprites/city-hangzhou.png")
                                    .frame(width: 40, height: 28)
                                    .background(Theme.soft, in: RoundedRectangle(cornerRadius: 5))
                                Text(year)
                                    .font(.system(size: 8, weight: .bold))
                            }
                            .padding(4)
                            .background(year == "2024" ? Theme.primaryLight : Color.clear, in: RoundedRectangle(cornerRadius: 6))
                        }
                    }
                }
                .scrollIndicators(.hidden)
                Text("本地记忆 \(memoriesCount) 条，按年份和城市进入。")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Theme.subText)
            }
        }
    }
}

struct CityBrowseCard: View {
    var body: some View {
        HomePanel(title: "按城市浏览") {
            VStack(spacing: 10) {
                StatRow(label: "杭州", value: "1,234")
                StatRow(label: "深圳", value: "856")
                StatRow(label: "上海", value: "621")
                StatRow(label: "东京", value: "312")
                StatRow(label: "日照", value: "210")
                Spacer()
                Text("查看全部")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Theme.subText)
            }
        }
    }
}

struct FinanceRoomCard: View {
    var body: some View {
        HomePanel(title: "4. 财务楼") {
            HStack(spacing: 12) {
                FinanceRoomScene()
                    .frame(width: 150, height: 120)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                VStack(alignment: .leading, spacing: 9) {
                    Text("总资产 (CNY)")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Theme.subText)
                    Text("¥ 2,568,700")
                        .font(.system(size: 20, weight: .bold))
                    Text("较上月 +12.5%")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Theme.success)
                }
            }
        }
    }
}

struct AssetDonutCard: View {
    var body: some View {
        HomePanel(title: "收入来源") {
            VStack(spacing: 10) {
                ZStack {
                    Circle().stroke(Theme.border, lineWidth: 14)
                    Circle()
                        .trim(from: 0, to: 0.45)
                        .stroke(Theme.ocean, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Circle()
                        .trim(from: 0.45, to: 0.70)
                        .stroke(Theme.success, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                }
                .frame(width: 70, height: 70)
                StatRow(label: "工资收入", value: "45%")
                StatRow(label: "投资收益", value: "25%")
                StatRow(label: "副业收入", value: "20%")
            }
        }
    }
}

struct CityDistributionMiniCard: View {
    var body: some View {
        HomePanel(title: "城市分布") {
            VStack(spacing: 9) {
                MiniBar(label: "杭州", value: 0.35)
                MiniBar(label: "深圳", value: 0.25)
                MiniBar(label: "上海", value: 0.20)
                MiniBar(label: "东京", value: 0.10)
                MiniBar(label: "其他", value: 0.10)
            }
        }
    }
}

struct LifeTimelineCard: View {
    let stages: [HomeLifeStage]

    var body: some View {
        HomePanel(title: "7. 人生轨迹 - 3 万天的进展") {
            VStack(alignment: .leading, spacing: 12) {
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.border).frame(height: 4)
                    Capsule().fill(Theme.primary).frame(width: 380, height: 4)
                    Text("Day 10,532")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Theme.primary, in: Capsule())
                        .offset(x: 350, y: -20)
                }
                HStack(spacing: 8) {
                    ForEach(stages, id: \.title) { stage in
                        LifeStageTile(stage: stage, isActive: stage.title == "创业阶段")
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
    }
}

struct LifeStageTile: View {
    let stage: HomeLifeStage
    let isActive: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            AssetImage(stage.assetPath)
                .frame(height: 50)
                .frame(maxWidth: .infinity)
                .background(Theme.soft, in: RoundedRectangle(cornerRadius: 8))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            Text(stage.title)
                .font(.system(size: 12, weight: .bold))
            Text(stage.range)
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(Theme.subText)
        }
        .padding(10)
        .frame(width: 106, alignment: .leading)
        .background(isActive ? Theme.primaryLight : Theme.soft, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(isActive ? Theme.primary : Theme.border, lineWidth: isActive ? 2 : 1)
        )
    }
}

struct HomePanel<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color(hex: 0x1F2937))
            content
        }
        .padding(12)
        .background(Theme.cream, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Theme.border, lineWidth: 1)
        )
    }
}

struct MiniStat: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.system(size: 8, weight: .semibold))
                .foregroundStyle(Theme.subText)
            Text(value)
                .font(.system(size: 11, weight: .bold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct StatRow: View {
    let label: String
    let value: String
    var tint: Color = Theme.subText

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(Theme.subText)
            Spacer()
            Text(value)
                .fontWeight(.bold)
                .foregroundStyle(tint)
        }
        .font(.system(size: 10, weight: .semibold))
    }
}

struct MiniBar: View {
    let label: String
    let value: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                Spacer()
                Text("\(Int(value * 100))%")
            }
            .font(.system(size: 9, weight: .bold))
            ProgressView(value: value)
                .tint(Theme.primary)
        }
    }
}
