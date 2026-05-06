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
