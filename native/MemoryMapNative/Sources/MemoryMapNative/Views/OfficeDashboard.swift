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
                    HStack(spacing: 14) {
                        EmployeePanel()
                        MonthlyPanel()
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

struct EmployeePanel: View {
    private let employees = [
        ("Emma", "研究员", "项目研究", "public/assets/game/sprites/agent-researcher.png", true),
        ("Lily", "设计师", "界面设计", "public/assets/game/sprites/agent-designer.png", true),
        ("Max", "分析师", "数据分析", "public/assets/game/sprites/agent-analyst.png", true),
        ("David", "数据师", "数据处理", "public/assets/game/sprites/agent-data.png", false),
        ("Kate", "助理", "设计支持", "public/assets/game/sprites/agent-assistant.png", true),
        ("Bot-01", "执行助手", "执行中", "public/assets/game/sprites/agent-bot.png", true)
    ]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("AI 员工").font(.headline)
                    Spacer()
                    Text("6 / 6").font(.caption).foregroundStyle(Theme.subText)
                }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(employees, id: \.0) { employee in
                        HStack(spacing: 10) {
                            AssetImage(employee.3).frame(width: 42, height: 42)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(employee.0).font(.caption.bold())
                                Text(employee.1).font(.caption2).foregroundStyle(Theme.subText)
                                Text(employee.2).font(.caption2).foregroundStyle(Theme.subText)
                            }
                            Spacer(minLength: 4)
                            Circle().fill(employee.4 ? Theme.success : Theme.warning).frame(width: 8, height: 8)
                        }
                        .padding(8)
                        .background(Theme.soft, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            }
        }
    }
}

struct MonthlyPanel: View {
    private let kpis = [
        ("收入 (CNY)", "¥ 2,568,700", "+12.5%"),
        ("项目完成", "18", "+20%"),
        ("专注时长", "136h", "+15%")
    ]
    private let chartPoints: [Double] = [10, 24, 44, 36, 64, 78, 72, 58, 92, 82, 70, 68, 78]

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("月度指标").font(.headline)
                    Spacer()
                    Text("May 2026").font(.caption).foregroundStyle(Theme.subText)
                }
                HStack(spacing: 10) {
                    ForEach(kpis, id: \.0) { kpi in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(kpi.0)
                                .font(.caption2)
                                .foregroundStyle(Theme.subText)
                            Text(kpi.1)
                                .font(.caption.bold())
                            Text(kpi.2)
                                .font(.caption2.bold())
                                .foregroundStyle(Theme.success)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                MonthlyLine(points: chartPoints)
                    .frame(height: 110)
            }
        }
    }
}

struct MonthlyLine: View {
    let points: [Double]

    var body: some View {
        GeometryReader { geometry in
            Path { path in
                guard let minValue = points.min(), let maxValue = points.max(), maxValue > minValue else { return }
                for (index, value) in points.enumerated() {
                    let x = geometry.size.width * CGFloat(index) / CGFloat(Swift.max(1, points.count - 1))
                    let normalized = (value - minValue) / (maxValue - minValue)
                    let y = geometry.size.height * CGFloat(1 - normalized)
                    if index == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }
            }
            .stroke(Theme.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
            .background(Theme.soft, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
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
