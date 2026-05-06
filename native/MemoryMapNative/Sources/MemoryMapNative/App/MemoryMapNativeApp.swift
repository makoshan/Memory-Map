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
