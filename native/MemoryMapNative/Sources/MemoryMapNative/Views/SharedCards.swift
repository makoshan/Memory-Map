import MemoryMapNativeCore
import SwiftUI

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
                    Label(exported ? "已导出世界状态" : "导出 world_state.json", systemImage: "square.and.arrow.up")
                }
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
                AssetScenePreview(asset: asset)
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

struct AssetScenePreview: View {
    let asset: String

    var body: some View {
        if asset == "scene:office" {
            OfficeRoomScene()
        } else if asset == "scene:memory" {
            MemoryGalleryScene()
        } else if asset == "scene:finance" || asset.contains("finance") {
            FinanceRoomScene()
        } else if asset == "scene:daily" || asset.contains("daily") {
            DailySummaryScene()
        } else if asset == "scene:world-map" || asset.contains("worldmap") || asset.contains("world-map") {
            StylizedWorldMapScene()
        } else {
            AssetImage(asset)
        }
    }
}

struct OfficeRoomScene: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: 0xE8F7FF), Color(hex: 0xD5EDF9), Color(hex: 0xF7F2E8)],
                startPoint: .top,
                endPoint: .bottom
            )
            OfficeWindowWall()
            OfficeFloor()
            OfficeDesk(x: 92, y: 116, width: 92, hasPlant: true)
            OfficeDesk(x: 214, y: 126, width: 108, hasPlant: false)
            OfficeDesk(x: 338, y: 118, width: 94, hasPlant: true)
            AssetImage("public/assets/generated/v2/sprites/char-analyst.png")
                .frame(width: 36, height: 36)
                .position(x: 130, y: 114)
            AssetImage("public/assets/generated/v2/sprites/char-researcher.png")
                .frame(width: 36, height: 36)
                .position(x: 248, y: 120)
            AssetImage("public/assets/generated/v2/sprites/char-female.png")
                .frame(width: 34, height: 34)
                .position(x: 365, y: 112)
        }
        .compositingGroup()
    }
}

struct OfficeWindowWall: View {
    var body: some View {
        ZStack {
            ForEach(0..<4, id: \.self) { index in
                RoundedRectangle(cornerRadius: 4)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: 0x8DD3F1), Color(hex: 0xE9F8FF)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(.white.opacity(0.86), lineWidth: 2))
                    .frame(width: 70, height: 82)
                    .position(x: CGFloat(70 + index * 78), y: 56)
            }
            ForEach(0..<3, id: \.self) { index in
                VStack(alignment: .leading, spacing: 5) {
                    Capsule().fill(Theme.primary).frame(width: 48, height: 5)
                    Capsule().fill(Theme.success).frame(width: 32, height: 5)
                    Capsule().fill(Theme.warning).frame(width: 42, height: 5)
                }
                .padding(8)
                .background(Color(hex: 0x24415E).opacity(0.86), in: RoundedRectangle(cornerRadius: 5))
                .position(x: CGFloat(176 + index * 78), y: 42)
            }
        }
    }
}

struct OfficeFloor: View {
    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color(hex: 0xD8C4A5).opacity(0.58))
                .frame(height: 70)
                .position(x: 210, y: 140)
            ForEach(0..<8, id: \.self) { index in
                Rectangle()
                    .fill(.white.opacity(0.34))
                    .frame(width: 1, height: 160)
                    .rotationEffect(.degrees(64))
                    .position(x: CGFloat(index * 64), y: 128)
            }
        }
    }
}

struct OfficeDesk: View {
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let hasPlant: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(hex: 0x6C4A2F))
                .frame(width: width, height: 20)
                .position(x: x, y: y)
            ForEach(0..<2, id: \.self) { index in
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color(hex: 0x263B52))
                    .frame(width: 24, height: 16)
                    .overlay(Rectangle().fill(Theme.ocean).padding(4))
                    .position(x: x - width / 4 + CGFloat(index * 35), y: y - 17)
            }
            if hasPlant {
                AssetImage("public/assets/generated/v2/sprites/flower-bed.png")
                    .frame(width: 24, height: 20)
                    .position(x: x + width / 2 - 8, y: y - 18)
            }
        }
    }
}

struct MemoryGalleryScene: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(hex: 0xF3E1C7), Color(hex: 0xE5C8A3)], startPoint: .top, endPoint: .bottom)
            Rectangle()
                .fill(Color(hex: 0x7B4E32).opacity(0.18))
                .frame(height: 40)
                .position(x: 210, y: 136)
            ForEach(0..<12, id: \.self) { index in
                GalleryFrame(index: index)
            }
            RoundedRectangle(cornerRadius: 5)
                .fill(Color(hex: 0x7A503B))
                .frame(width: 132, height: 28)
                .position(x: 286, y: 124)
            AssetImage("public/assets/generated/v2/sprites/char-assistant.png")
                .frame(width: 34, height: 34)
                .position(x: 214, y: 118)
            AssetImage("public/assets/generated/v2/sprites/bench.png")
                .frame(width: 72, height: 28)
                .position(x: 88, y: 130)
        }
    }
}

struct GalleryFrame: View {
    let index: Int

    var body: some View {
        let x = CGFloat(38 + (index % 6) * 58)
        let y = CGFloat(34 + (index / 6) * 42)
        RoundedRectangle(cornerRadius: 4)
            .fill(.white.opacity(0.9))
            .overlay(
                AssetImage([
                    "public/assets/imported/user-atlas/sprites/city-hangzhou.png",
                    "public/assets/imported/user-atlas/sprites/city-shenzhen.png",
                    "public/assets/imported/user-atlas/sprites/city-shanghai.png",
                    "public/assets/imported/user-atlas/sprites/city-tokyo.png"
                ][index % 4])
                .padding(4)
            )
            .frame(width: 44, height: 30)
            .shadow(color: .black.opacity(0.08), radius: 3, y: 2)
            .position(x: x, y: y)
    }
}

struct FinanceRoomScene: View {
    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let height = proxy.size.height

            ZStack {
                LinearGradient(colors: [Color(hex: 0x203B58), Color(hex: 0xE7D0A6)], startPoint: .top, endPoint: .bottom)
                ForEach(0..<3, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 5)
                        .fill(Color(hex: 0x12253A).opacity(0.9))
                        .overlay(FinanceMiniChart(index: index).padding(6))
                        .frame(width: width * 0.22, height: height * 0.30)
                        .position(x: width * CGFloat(0.22 + Double(index) * 0.28), y: height * 0.28)
                }
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(hex: 0x6C4A2F))
                    .frame(width: width * 0.56, height: height * 0.14)
                    .position(x: width * 0.56, y: height * 0.74)
                AssetImage("public/assets/generated/v2/sprites/finance-lv3.png")
                    .frame(width: width * 0.36, height: height * 0.56)
                    .position(x: width * 0.24, y: height * 0.70)
                AssetImage("public/assets/generated/v2/addon-sprites/icon-coin.png")
                    .frame(width: width * 0.18, height: height * 0.18)
                    .position(x: width * 0.82, y: height * 0.67)
            }
        }
    }
}

struct FinanceMiniChart: View {
    let index: Int

    var body: some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(0..<4, id: \.self) { bar in
                RoundedRectangle(cornerRadius: 2)
                    .fill([Theme.ocean, Theme.success, Theme.warning, Theme.primary][(index + bar) % 4])
                    .frame(width: 6, height: CGFloat(10 + ((index + bar) % 4) * 7))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct DailySummaryScene: View {
    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let height = proxy.size.height

            ZStack {
                LinearGradient(colors: [Color(hex: 0xFFE7B4), Color(hex: 0xF7FAFF)], startPoint: .top, endPoint: .bottom)
                AssetImage("public/assets/imported/user-atlas/sprites/city-hangzhou.png")
                    .frame(width: width * 0.48, height: height * 0.58)
                    .position(x: width * 0.34, y: height * 0.50)
                VStack(alignment: .leading, spacing: max(3, height * 0.05)) {
                    SummaryLine(label: "专注", value: 0.62, color: Theme.primary)
                    SummaryLine(label: "记忆", value: 0.48, color: Theme.success)
                    SummaryLine(label: "完成", value: 0.72, color: Theme.warning)
                }
                .padding(max(6, height * 0.07))
                .background(.white.opacity(0.86), in: RoundedRectangle(cornerRadius: 8))
                .position(x: width * 0.72, y: height * 0.52)
            }
        }
    }
}

struct SummaryLine: View {
    let label: String
    let value: Double
    let color: Color

    var body: some View {
        HStack(spacing: 7) {
            Text(label)
                .font(.system(size: 9, weight: .bold))
                .frame(width: 26, alignment: .leading)
            ProgressView(value: value)
                .tint(color)
                .frame(width: 72)
        }
    }
}

struct StylizedWorldMapScene: View {
    private let pins: [(String, CGFloat, CGFloat, Color)] = [
        ("杭州", 0.62, 0.48, Theme.primary),
        ("深圳", 0.59, 0.58, Theme.success),
        ("东京", 0.78, 0.46, Theme.warning),
        ("上海", 0.65, 0.43, Color(hex: 0x9B7AF6)),
        ("北极", 0.50, 0.20, Theme.ocean)
    ]

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                LinearGradient(colors: [Color(hex: 0x78D1F2), Color(hex: 0x1C82C1)], startPoint: .top, endPoint: .bottom)
                MapContinentBlob(width: 190, height: 72, rotation: -8)
                    .position(x: proxy.size.width * 0.28, y: proxy.size.height * 0.42)
                MapContinentBlob(width: 210, height: 86, rotation: 12)
                    .position(x: proxy.size.width * 0.64, y: proxy.size.height * 0.44)
                MapContinentBlob(width: 92, height: 44, rotation: 26)
                    .position(x: proxy.size.width * 0.48, y: proxy.size.height * 0.66)
                ForEach(pins, id: \.0) { pin in
                    VStack(spacing: 1) {
                        Image(systemName: "mappin.circle.fill")
                            .foregroundStyle(pin.3)
                            .font(.system(size: 20, weight: .bold))
                        Text(pin.0)
                            .font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(.white.opacity(0.86), in: Capsule())
                    }
                    .position(x: proxy.size.width * pin.1, y: proxy.size.height * pin.2)
                }
            }
        }
    }
}

struct MapContinentBlob: View {
    let width: CGFloat
    let height: CGFloat
    let rotation: Double

    var body: some View {
        Capsule()
            .fill(Color(hex: 0x76A86A).opacity(0.84))
            .overlay(Capsule().stroke(Color(hex: 0xE2D18C).opacity(0.72), lineWidth: 4))
            .frame(width: width, height: height)
            .rotationEffect(.degrees(rotation))
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

struct AdaptiveDashboardColumns<Main: View, Rail: View>: View {
    @ViewBuilder var main: Main
    @ViewBuilder var rail: Rail

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: 18) {
                main
                RightRail {
                    rail
                }
            }
            VStack(alignment: .leading, spacing: 18) {
                main
                rail
            }
        }
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
