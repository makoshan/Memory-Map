import MemoryMapNativeCore
import SwiftUI

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
