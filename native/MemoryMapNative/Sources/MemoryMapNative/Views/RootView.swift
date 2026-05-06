import SwiftUI

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
