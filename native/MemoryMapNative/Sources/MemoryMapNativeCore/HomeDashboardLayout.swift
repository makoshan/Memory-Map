import Foundation

public struct HomeDashboardLayout: Equatable, Sendable {
    public let sidebarItems: [HomeSidebarItem]
    public let worldBuildings: [HomeWorldBuilding]
    public let primaryStatusMetrics: [HomeStatusMetric]
    public let cityTabs: [String]
    public let lifeStages: [HomeLifeStage]

    public init(
        sidebarItems: [HomeSidebarItem],
        worldBuildings: [HomeWorldBuilding],
        primaryStatusMetrics: [HomeStatusMetric],
        cityTabs: [String],
        lifeStages: [HomeLifeStage]
    ) {
        self.sidebarItems = sidebarItems
        self.worldBuildings = worldBuildings
        self.primaryStatusMetrics = primaryStatusMetrics
        self.cityTabs = cityTabs
        self.lifeStages = lifeStages
    }

    public static let designReference = HomeDashboardLayout(
        sidebarItems: [
            HomeSidebarItem(title: "首页", subtitle: "我的世界", systemImage: "house.fill"),
            HomeSidebarItem(title: "今日", subtitle: "任务 · 日历", systemImage: "calendar"),
            HomeSidebarItem(title: "记忆馆", subtitle: "照片 · 日记 · 音频", systemImage: "camera.fill"),
            HomeSidebarItem(title: "财务楼", subtitle: "资产 · 收支 · 投资", systemImage: "dollarsign.circle.fill"),
            HomeSidebarItem(title: "身体工坊", subtitle: "健康 · 睡眠 · 活动", systemImage: "heart.fill"),
            HomeSidebarItem(title: "AI 员工", subtitle: "我的团队", systemImage: "desktopcomputer")
        ],
        worldBuildings: [
            HomeWorldBuilding(title: "办公室", level: "Lv.8", role: "work", assetPath: "public/assets/game/sprites/office-island.png", x: 0.24, y: 0.31),
            HomeWorldBuilding(title: "记忆馆", level: "Lv.7", role: "memory", assetPath: "public/assets/game/sprites/memory-museum-island.png", x: 0.49, y: 0.28),
            HomeWorldBuilding(title: "财务楼", level: "Lv.6", role: "finance", assetPath: "public/assets/game/sprites/finance-tower-island.png", x: 0.76, y: 0.35),
            HomeWorldBuilding(title: "生活区", level: "Lv.5", role: "life", assetPath: "public/assets/game/sprites/recovery-garden-island.png", x: 0.16, y: 0.61),
            HomeWorldBuilding(title: "家", level: "Lv.10", role: "home", assetPath: "public/assets/game/sprites/home-base-island.png", x: 0.50, y: 0.63),
            HomeWorldBuilding(title: "AI 研究所", level: "Lv.7", role: "ai", assetPath: "public/assets/game/sprites/ai-research-lab-island.png", x: 0.80, y: 0.67)
        ],
        primaryStatusMetrics: [
            HomeStatusMetric(title: "时间", value: "68%", caption: "8.2h / 12h", tintHex: 0x4B9CFF),
            HomeStatusMetric(title: "精力", value: "75%", caption: "良好", tintHex: 0xF59E0B),
            HomeStatusMetric(title: "心情", value: "82%", caption: "愉快", tintHex: 0x22C55E)
        ],
        cityTabs: ["杭州", "深圳", "东京", "北极", "上海"],
        lifeStages: [
            HomeLifeStage(title: "学生时代", range: "0 - 7,300 天", assetPath: "public/assets/imported/user-atlas/sprites/city-hangzhou.png"),
            HomeLifeStage(title: "职场初期", range: "7,301 - 10,000 天", assetPath: "public/assets/imported/user-atlas/sprites/city-shanghai.png"),
            HomeLifeStage(title: "创业阶段", range: "10,001 - 12,500 天", assetPath: "public/assets/ai-company/island.png"),
            HomeLifeStage(title: "自由探索", range: "12,501 - 20,000 天", assetPath: "public/assets/imported/user-atlas/sprites/city-tokyo.png"),
            HomeLifeStage(title: "未来更多", range: "20,001+ 天", assetPath: "public/assets/generated/v2/sprites/world-map-panel.png")
        ]
    )
}

public struct HomeSidebarItem: Equatable, Sendable {
    public let title: String
    public let subtitle: String
    public let systemImage: String

    public init(title: String, subtitle: String, systemImage: String) {
        self.title = title
        self.subtitle = subtitle
        self.systemImage = systemImage
    }
}

public struct HomeWorldBuilding: Equatable, Sendable {
    public let title: String
    public let level: String
    public let role: String
    public let assetPath: String
    public let x: Double
    public let y: Double

    public init(title: String, level: String, role: String, assetPath: String, x: Double, y: Double) {
        self.title = title
        self.level = level
        self.role = role
        self.assetPath = assetPath
        self.x = x
        self.y = y
    }
}

public struct HomeStatusMetric: Equatable, Sendable {
    public let title: String
    public let value: String
    public let caption: String
    public let tintHex: UInt

    public init(title: String, value: String, caption: String, tintHex: UInt) {
        self.title = title
        self.value = value
        self.caption = caption
        self.tintHex = tintHex
    }
}

public struct HomeLifeStage: Equatable, Sendable {
    public let title: String
    public let range: String
    public let assetPath: String

    public init(title: String, range: String, assetPath: String) {
        self.title = title
        self.range = range
        self.assetPath = assetPath
    }
}
