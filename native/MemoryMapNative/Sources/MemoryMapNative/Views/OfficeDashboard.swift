import SwiftUI

struct OfficeDashboard: View {
    var body: some View {
        DashboardScaffold(title: "办公室", subtitle: "Lv.8 · AI 员工与你一起推动项目") {
            HStack(alignment: .top, spacing: 18) {
                VStack(spacing: 18) {
                    HeroImageCard(asset: "public/assets/office-room/office_scene.jpg", title: "创造与工作的中心", progress: 0.65)
                    HStack(spacing: 14) {
                        TaskPanel()
                        ProjectPanel()
                    }
                }
                RightRail {
                    StatListCard(title: "建筑属性", rows: [
                        ("面积", "850 m2"),
                        ("员工", "6 / 6"),
                        ("效率", "125%"),
                        ("维护费用", "320 / 天")
                    ])
                    UpgradeCard(title: "下一等级", value: "Lv.9", bullets: ["面积 +100", "效率 +15%", "员工上限 +1"])
                }
            }
        }
    }
}

struct TaskPanel: View {
    private let tasks = [
        ("10:00", "产品设计评审", true),
        ("14:00", "AI 研究进展同步", true),
        ("16:00", "财务月度分析", false),
        ("19:00", "运动 · 跑步 5km", false)
    ]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Text("今日任务")
                    .font(.headline)
                ForEach(tasks, id: \.1) { task in
                    HStack {
                        Text(task.0)
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(Theme.subText)
                        Text(task.1)
                        Spacer()
                        Image(systemName: task.2 ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(task.2 ? Theme.success : Theme.muted)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
    }
}

struct ProjectPanel: View {
    private let projects = [
        ("AI 产品优化项目", 0.72),
        ("用户研究分析", 0.58),
        ("数据模型训练", 0.45),
        ("市场调研报告", 0.28)
    ]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Text("项目进度")
                    .font(.headline)
                ForEach(projects, id: \.0) { project in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(project.0)
                            Spacer()
                            Text("\(Int(project.1 * 100))%")
                                .font(.caption.bold())
                        }
                        ProgressView(value: project.1)
                            .tint(Theme.primary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }
}
