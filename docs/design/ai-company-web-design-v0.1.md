# 一个人的 AI 公司：网页设计规范 v0.1

## 1. 设计定位

整体风格是白色系统界面 + City Pop 像素游戏世界 + Mac 原生 App 质感。关键词是清爽、白天、轻游戏、信息清晰、像素温度、AI 公司感。

不要做成暗黑科幻、复杂仪表盘、纯游戏 UI 或纯 Notion 工具。用户看到的是一个世界，不是一个系统。

## 2. 页面整体布局

所有主页面统一采用三栏结构：

```text
Top Bar 顶部状态栏
左侧栏 Nav | 主内容区域 Scene + Cards | 右侧栏 Info
```

桌面优先适配 1440 / 1536 / 1728 宽度，最小适配 1280px。基础栅格：

- 左侧栏：160px
- 右侧栏：220-280px，当前实现 248px
- 主区域：自适应
- 页面间距：16px
- 卡片间距：12-16px
- 圆角：12-16px

## 3. 色彩与字体

CSS tokens 写在 `src/styles.css` 的 `:root` 中，页面和基础组件必须优先使用变量。

```css
--bg-main: #F7F8FB;
--bg-card: #FFFFFF;
--bg-soft: #F4F7FB;
--primary: #4B9CFF;
--primary-hover: #2F84EA;
--primary-light: #EAF4FF;
--text-main: #111827;
--text-sub: #475569;
--text-muted: #94A3B8;
--success: #22C55E;
--warning: #F59E0B;
--danger: #EF4444;
--energy: #FBBF24;
--border: #E2E8F0;
--border-soft: #EEF2F7;
```

字体优先使用 Apple 系统字体、SF Pro Display、PingFang SC、Microsoft YaHei、Arial、sans-serif。页面标题 28-32px，模块标题 18-20px，正文 14-16px，辅助说明 12-13px，数字指标 22-28px。

## 4. 基础组件

组件命名和职责：

- `AppShell`：统一三栏页面框架，承载 `TopBar`、`Sidebar`、主内容和右侧信息栏。
- `TopBar`：只放全局状态，包括用户、城市、天气、金币、记忆、能量、日历、消息、设置、全屏。
- `Sidebar`：固定主要空间入口，包括世界地图、办公室、记忆馆、财务楼、生活区、AI 研究所、任务、设置。
- `DesignCard`：统一卡片基础样式，所有模块卡片继承它。
- `SceneCard`：主场景容器，首页是岛屿城市，办公室是室内空间。
- `BuildingInfoPanel` / `UpgradePanel`：右侧栏状态和操作。
- `TaskCard`、`AgentCard`、`ProjectProgressCard`、`FinanceCard`、`MemoryCard`、`TimelineCard`：主场景下方最多 4 个核心卡片。

所有卡片基线：

```css
.design-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.04);
}
```

## 5. 页面规则

首页是岛屿城市，办公室是办公室室内，记忆馆是记忆室或照片墙，财务楼是数据办公室，生活区是恢复空间，AI 研究所是实验室。场景必须白天、明亮、浅色、City Pop、像素或 2.5D，不做暗黑和重科幻。

右侧栏只做当前空间状态 + 操作，不放复杂图表。主场景下方最多 4 个核心卡片：首页放今日任务、办公室、记忆馆、财务楼；办公室放今日任务、AI 员工、项目进度、本月数据。

交互统一：

- 点击建筑进入建筑页面。
- 点击城市切换或缩放城市。
- 点击记忆卡片打开详情弹窗。
- 点击 AI 员工查看任务状态。
- hover 150ms，页面切换 250ms，建筑进入 300-500ms，城市缩放 600-900ms。

## 6. 最小实现标准

第一版必须统一三栏布局、顶部状态栏、左侧导航、白色卡片系统、主场景图、圆角、间距和阴影。首页和 `/office` 必须使用相同的 `AppShell`、`TopBar`、`Sidebar`、`right-rail`、`main-stage` 和 `DesignCard` 基础层，否则会像几张拼起来的图，不像一个产品。

## 7. 参考

参考 [nexu-io/open-design](https://github.com/nexu-io/open-design) 的方法论：把设计系统、规则文档、可复用组件和预览验证闭环放在同一个工程实践里，而不是只做单页静态视觉。
