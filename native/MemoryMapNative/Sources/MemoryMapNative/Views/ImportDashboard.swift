import MemoryMapNativeCore
import SwiftUI

struct ImportDashboard: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        DashboardScaffold(title: "导入工作台", subtitle: "Native file picker · local inference · Swift state") {
            VStack(alignment: .leading, spacing: 18) {
                Card {
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 18) {
                            ImportHeroContent(message: store.importMessage)
                            Spacer()
                            ImportButton()
                        }
                        VStack(alignment: .leading, spacing: 14) {
                            ImportHeroContent(message: store.importMessage)
                            ImportButton()
                        }
                    }
                }
                ImportProgressCard(steps: store.lastImportSteps)
                ImportEvidenceCard(
                    gps: store.lastGpsEvidenceLabel,
                    address: store.lastAddressLabel,
                    hermes: store.lastHermesPreview,
                    world: store.worldSyncStatus.layer3
                )
                MemoryGrid(items: store.memories)
            }
        }
    }
}

struct ImportHeroContent: View {
    let message: String

    var body: some View {
        HStack(spacing: 18) {
            Image(systemName: "square.and.arrow.down.on.square")
                .font(.system(size: 44, weight: .medium))
                .foregroundStyle(Theme.primary)
            VStack(alignment: .leading, spacing: 8) {
                Text("选择文件，生成本机记忆卡")
                    .font(.title2.bold())
                Text(message)
                    .foregroundStyle(Theme.subText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

struct ImportButton: View {
    @EnvironmentObject private var store: MemoryMapStore

    var body: some View {
        Button {
            store.presentImportPanel()
        } label: {
            Label("导入文件", systemImage: "plus")
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
    }
}

struct ImportEvidenceCard: View {
    let gps: String
    let address: String
    let hermes: String
    let world: String

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                Text("证据面板")
                    .font(.headline)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 12)], spacing: 12) {
                    EvidenceMiniPanel(title: "EXIF GPS", value: gps)
                    EvidenceMiniPanel(title: "Amap provider", value: address)
                    EvidenceMiniPanel(title: "Hermes image meaning", value: hermes)
                    EvidenceMiniPanel(title: "World sync evidence", value: world)
                }
            }
        }
    }
}

struct EvidenceMiniPanel: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(Theme.subText)
            Text(value)
                .font(.caption)
                .lineLimit(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.soft, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct ImportProgressCard: View {
    let steps: [ImportProgressStep]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                Text("导入流程")
                    .font(.headline)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 12)], spacing: 12) {
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
