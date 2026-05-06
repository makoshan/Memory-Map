# Homepage World OS Redesign Spec

## Goal

重做 SwiftUI 原生首页，使它对齐 `docs/产品设计图.png` 的 World OS 第一屏，而不是普通系统侧栏加 dashboard。

## Source Of Truth

- `DESIGN.md` 的 `Homepage / World OS Source Of Truth` 章节是视觉规范。
- `HomeDashboardLayout.designReference` 是首页内容结构的代码规范。
- 首页必须包含：Profile Sidebar、World Canvas、World Bar、建筑浮标、Today Status Panel、Focus Strip、Detail Rail。

## Implementation

- `MemoryMapNativeCore/HomeDashboardLayout.swift` 提供可测试首页结构数据。
- `RootView.swift` 使用自定义 HStack shell 替代默认 `NavigationSplitView`，左侧固定为 Profile Sidebar。
- `WorldDashboard.swift` 重做为一屏 World OS：中央世界地图、右侧办公室/记忆/财务/人生轨迹卡、下方今日重点和城市切换。
- `DESIGN.md` 同步写入首页视觉规范，避免后续实现继续偏离。

## Testing

- 新增 `HomeDashboardLayoutTests`，锁定首页入口、建筑等级、状态指标、城市 tab 和人生阶段。
- 完成后运行 `swift test`、`swift build` 和 `.app` 打包脚本。
