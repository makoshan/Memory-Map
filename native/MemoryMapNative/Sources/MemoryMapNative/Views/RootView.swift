import MemoryMapNativeCore
import SwiftUI

struct RootView: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        GeometryReader { proxy in
            let sidebarWidth: CGFloat = 166
            let outerPadding: CGFloat = 10
            let contentSpacing: CGFloat = 10
            let contentWidth = max(0, proxy.size.width - sidebarWidth - contentSpacing - outerPadding * 2)

            HStack(alignment: .top, spacing: contentSpacing) {
                ProfileSidebar()
                    .frame(width: sidebarWidth)

                currentDashboard
                    .frame(width: contentWidth, alignment: .topLeading)
            }
            .padding(outerPadding)
        }
        .background(Theme.background)
    }

    @ViewBuilder
    private var currentDashboard: some View {
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
}

struct ProfileSidebar: View {
    @EnvironmentObject private var store: MemoryMapStore
    private let layout = HomeDashboardLayout.designReference

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Circle().fill(Color(hex: 0xFF5F57)).frame(width: 10, height: 10)
                Circle().fill(Color(hex: 0xFFBD2E)).frame(width: 10, height: 10)
                Circle().fill(Color(hex: 0x28C840)).frame(width: 10, height: 10)
            }
            .padding(.top, 12)
            .padding(.horizontal, 8)

            HStack(spacing: 10) {
                AssetImage("public/assets/game/sprites/player-alex.png")
                    .frame(width: 48, height: 48)
                    .background(Theme.primaryLight, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text("Alex Chen")
                        .font(.system(size: 13, weight: .bold))
                    Text("CEO of Me Inc.")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Theme.subText)
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Day 10,532")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.subText)
                HStack(spacing: 6) {
                    Label("Lv.42", systemImage: "building.columns.fill")
                        .labelStyle(.titleAndIcon)
                    ProgressView(value: 0.68)
                        .tint(Color(hex: 0x49B8C4))
                    Text("68%")
                }
                .font(.system(size: 10, weight: .bold))
            }

            VStack(spacing: 7) {
                ForEach(layout.sidebarItems, id: \.title) { item in
                    ProfileNavButton(
                        item: item,
                        isActive: activeTitle == item.title
                    ) {
                        store.selection = destination(for: item.title)
                    }
                }
            }

            Spacer(minLength: 12)

            HStack {
                SidebarTool(systemImage: "calendar.badge.plus")
                Spacer()
                SidebarTool(systemImage: "calendar")
                Spacer()
                SidebarTool(systemImage: "questionmark.circle")
                Spacer()
                SidebarTool(systemImage: "gearshape")
            }
            .padding(.bottom, 6)
        }
        .padding(10)
        .frame(width: 166)
        .frame(maxHeight: .infinity)
        .background(Theme.cream, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(Theme.border, lineWidth: 1)
        )
    }

    private var activeTitle: String {
        switch store.selection ?? .world {
        case .world: "首页"
        case .office: "AI 员工"
        case .memory: "记忆馆"
        case .importLab: "今日"
        }
    }

    private func destination(for title: String) -> AppSection {
        switch title {
        case "记忆馆": .memory
        case "今日": .importLab
        case "AI 员工": .office
        default: .world
        }
    }
}

struct ProfileNavButton: View {
    let item: HomeSidebarItem
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 9) {
                Image(systemName: item.systemImage)
                    .font(.system(size: 18, weight: .semibold))
                    .frame(width: 24)
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title)
                        .font(.system(size: 13, weight: .bold))
                    Text(item.subtitle)
                        .font(.system(size: 10, weight: .semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
                Spacer(minLength: 0)
            }
            .foregroundStyle(isActive ? Color.white : Theme.subText)
            .padding(.horizontal, 9)
            .frame(height: 50)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(isActive ? Theme.primary : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }
}

struct SidebarTool: View {
    let systemImage: String

    var body: some View {
        Image(systemName: systemImage)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Theme.subText)
            .frame(width: 26, height: 26)
    }
}
