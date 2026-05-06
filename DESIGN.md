---
version: alpha
name: Me Inc. World OS
description: 白色系统界面 + City Pop 像素游戏世界 + Mac 原生 App 质感。用于“一个人的 AI 公司”网页 / Mac App / 游戏化空间。
colors:
  bg-main: "#F7F8FB"
  bg-card: "#FFFFFF"
  bg-soft: "#F4F7FB"
  primary: "#4B9CFF"
  primary-strong: "#1D6FD1"
  primary-hover: "#2F84EA"
  primary-light: "#EAF4FF"
  text-main: "#111827"
  text-sub: "#475569"
  text-muted: "#94A3B8"
  border: "#E2E8F0"
  border-soft: "#EEF2F7"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
  energy: "#FBBF24"
  ocean: "#35B8FF"
  sky: "#BFE9FF"
  grass: "#7EDB8A"
  city-pop-pink: "#FFB6C8"
  city-pop-yellow: "#FFE08A"
typography:
  h1:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, PingFang SC, Microsoft YaHei, Arial, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0
  h2:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, PingFang SC, Microsoft YaHei, Arial, sans-serif"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0
  h3:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, PingFang SC, Microsoft YaHei, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: 0
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, PingFang SC, Microsoft YaHei, Arial, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, PingFang SC, Microsoft YaHei, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  number:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, PingFang SC, Microsoft YaHei, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0
rounded:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
effects:
  shadow-card: "0 8px 30px rgba(15, 23, 42, 0.04)"
components:
  app-shell:
    backgroundColor: "{colors.bg-main}"
    textColor: "{colors.text-main}"
    padding: "{spacing.lg}"
  top-bar:
    backgroundColor: "{colors.bg-main}"
    textColor: "{colors.text-main}"
    height: 70px
  topbar-pill:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    height: 48px
    padding: "{spacing.lg}"
  sidebar:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    width: 160px
    padding: "{spacing.md}"
  right-rail:
    backgroundColor: "{colors.bg-main}"
    textColor: "{colors.text-main}"
    width: 248px
  card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  scene-card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xs}"
    height: 480px
  nav-item:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-sub}"
    rounded: "{rounded.md}"
    height: 52px
    padding: "{spacing.md}"
  nav-item-active:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.md}"
    height: 52px
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.md}"
    height: 44px
    padding: "{spacing.lg}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    height: 44px
    padding: "{spacing.lg}"
  button-secondary:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    height: 44px
    padding: "{spacing.lg}"
  progress-bar:
    backgroundColor: "{colors.border-soft}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.full}"
    height: 8px
  surface-soft-panel:
    backgroundColor: "{colors.bg-soft}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  primary-light-panel:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  brand-primary-accent:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  muted-caption:
    backgroundColor: "{colors.text-muted}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  status-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  energy-meter:
    backgroundColor: "{colors.energy}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.full}"
    height: 8px
  ocean-tile:
    backgroundColor: "{colors.ocean}"
    textColor: "{colors.text-main}"
  sky-tile:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.text-main}"
  grass-tile:
    backgroundColor: "{colors.grass}"
    textColor: "{colors.text-main}"
  city-pop-pink-accent:
    backgroundColor: "{colors.city-pop-pink}"
    textColor: "{colors.text-main}"
  city-pop-yellow-accent:
    backgroundColor: "{colors.city-pop-yellow}"
    textColor: "{colors.text-main}"
  border-line:
    backgroundColor: "{colors.border}"
    textColor: "{colors.text-main}"
    height: 1px
  border-soft-line:
    backgroundColor: "{colors.border-soft}"
    textColor: "{colors.text-main}"
    height: 1px
---

## Overview

“一个人的 AI 公司”是一个白色系统界面包裹的轻游戏化 Life OS。用户看到的不是数据系统，而是一个会生长的个人数字世界：城市、家、办公室、记忆馆、财务楼、生活区、AI 研究所。

视觉方向是：白天、清爽、Mac 原生、City Pop、轻像素、2.5D、低压迫感。界面要像一个可工作的 App，不像重度手游，也不像纯效率工具。

核心感受：

- 像进入自己的数字城市。
- 像管理一个人的 AI 公司。
- 像在玩一个轻量人生模拟游戏。
- 所有数据都被翻译成空间、建筑、等级和任务。

用户看到的是一个世界，不是一个系统。数据只作为状态出现，不作为解释出现。

## Colors

主背景使用接近白色的浅灰蓝 `#F7F8FB`，避免纯白刺眼。卡片统一使用白色 `#FFFFFF`。主交互色是明亮蓝 `#4B9CFF`，用于品牌感、进度条和轻量入口。

当白色文字出现在蓝色背景上时，必须使用 `primary-strong`，例如主按钮和左侧导航 active 态。`primary` 适合做图形、进度、浅色背景上的强调，不适合直接承载白字。

辅助色只用于状态：

- 绿色表示完成、效率提升、健康。
- 黄色表示能量、金币、注意事项。
- 红色只用于消息红点、错误、危险提醒。
- City Pop 色彩只用于插画和游戏场景，不要大量用于 UI 面板。

游戏场景可以使用高饱和的海水蓝、天空蓝、草地绿、粉色樱花、暖黄色阳光。UI 本身必须克制，保持白色、浅灰和蓝色为主。

## Typography

中文界面优先使用系统字体。不要使用过多装饰字体。标题要清晰、干净、有产品感。

层级：

- H1 用于页面主标题，例如“办公室”“记忆馆”。
- H2 用于卡片标题，例如“今日任务”“AI 员工”。
- Body 用于说明文字、任务、列表。
- Caption 用于标签、状态说明、时间。
- Number 用于资产、等级、进度数字。

避免大段文字。每张卡片最多 1 个标题、1 组核心数据、1 个主要操作。字距保持 `0`。

## Layout & Spacing

## Homepage / World OS Source Of Truth

首页必须以 `docs/产品设计图.png` 的第一屏为视觉基准。它不是普通后台 dashboard，也不是系统侧栏加内容页，而是一个桌面级 World OS 总览画布：左侧个人身份栏、中央大型 2.5D 世界地图、右侧和下方的模块化状态卡共同出现在同一屏。

首页首屏固定结构：

- 左侧 Profile Sidebar：宽度约 160-190px，白色卡片，macOS 窗口圆点、头像、姓名、身份、Day、等级进度、六个导航入口、底部工具图标。选中态使用蓝色渐变或强蓝底，白字，图标必须比文字更先被感知。
- 中央 World Canvas：首屏最大视觉区域，使用 City Pop 像素岛屿或世界地图资产作为主视觉，不允许用纯渐变或抽象占位替代。建筑浮标必须包含办公室、记忆馆、财务楼、生活区、家、AI 研究所，并显示等级。
- 顶部 World Bar：悬浮在世界画布顶部，包含城市、天气、空气、日历、通知、设置和头像入口。它属于世界画布，不是独立网页导航。
- 右下 Today Status Panel：叠在世界画布右下，显示时间、精力、心情三条进度。
- 下方 Focus Strip：包含今日重点、日历视图、每日总结和世界地图城市切换卡，作为首页第二行内容。
- 右侧 Detail Rail：包含办公室、记忆馆、财务楼和人生轨迹等模块卡。右侧卡片展示真实房间/图像资产和简洁数值，不放大段说明。

首页视觉规则：

- 中央世界图优先级最高，面积不得低于首屏内容宽度的 45%。
- 页面必须保留白色系统 UI 的轻盈感，所有信息卡片使用浅边框、低阴影和 12-16px 圆角。
- 卡片可以密集，但必须有清晰分组标题和稳定高度；不要把说明文字做成“功能介绍”。
- 首屏文字必须服务于状态和导航，不解释产品概念。
- 首页实现必须由可测试的 `HomeDashboardLayout.designReference` 驱动，避免设计图中的入口、建筑点和人生阶段在 UI 中散落硬编码。

全局使用三栏结构：

```text
TopBar
Sidebar | Main Content | Right Panel
```

桌面端基准：

- 页面宽度优先适配 1440px / 1536px / 1728px。
- 左侧 Sidebar：160px。
- 右侧信息栏：220px 到 280px，当前实现 248px。
- 主内容区自适应。
- 卡片间距：12px 到 16px。
- 页面外边距：16px 到 24px。

主内容区结构：

```text
Scene Card
Function Cards
```

不同页面使用同一布局：

- 世界：首页大岛屿场景 + 今日状态 + 城市入口。
- 办公室：办公室室内场景 + 今日任务 / AI 员工 / 项目进度 / 本月数据。
- 记忆馆：记忆室场景 + 记忆卡片 / 时间轴 / AI 记忆助手。
- 财务楼：财务空间场景 + 收入 / 支出 / 资产 / 城市资金分布。
- 生活区：生活空间场景 + 睡眠 / 运动 / 恢复 / 环境状态。

## Elevation & Depth

UI 使用轻阴影，不要重阴影。阴影只是帮助卡片从背景中分离，不制造强烈游戏 HUD 感。

推荐：

```css
box-shadow: 0 8px 30px rgba(15, 23, 42, 0.04);
```

悬浮卡片可以加一点透明度和毛玻璃，但不要过重：

```css
background: rgba(255, 255, 255, 0.86);
backdrop-filter: blur(12px);
```

游戏场景内部可以有更强的空间深度，UI 面板保持轻、白、克制。

## Shapes

圆角是核心风格。所有卡片、按钮、面板都应使用 12px 到 16px 圆角。头像、资源按钮、图标按钮使用 12px 圆角。进度条使用 full radius。

不要使用尖锐直角。不要使用过度拟物边框。不要做暗黑金属风。

## Components

### AppShell

页面总容器。背景使用 `bg-main`。内部使用三栏布局。

### TopBar

包含：

- 用户头像与等级。
- 当前城市。
- 天气。
- 资源：金币、宝石、能量。
- 操作：日历、消息、任务、设置、全屏。

TopBar 只放全局状态，不放复杂业务内容。

### Sidebar

固定左侧导航。导航项包括：

```text
世界地图
办公室
记忆馆
财务楼
生活区
AI 研究所
任务
设置
```

当前页面必须有明显 active 状态。Active 使用 `primary-strong` 背景以保证白字对比度。

### SceneCard

每个页面的视觉核心。显示当前空间：

- 世界地图：岛屿城市。
- 办公室：室内办公空间。
- 记忆馆：照片墙、记忆桌、回忆图谱。
- 财务楼：数据屏幕、资产流向。
- 生活区：花园、健身、恢复空间。
- AI 研究所：AI 实验室、模型训练屏幕。

SceneCard 可以使用图片或 Canvas / WebGL 渲染。第一版允许用静态图作为背景。

### InfoPanel

右侧信息栏，显示当前空间属性与升级信息。

例如办公室：

```text
建筑属性
面积
员工
效率
维护费用
升级效果
```

例如记忆馆：

```text
存储空间
整理效率
AI 分析能力
每日整理上限
最近回顾
```

### TaskCard

显示今日任务。结构：

```text
时间
任务标题
完成状态
```

完成状态使用绿色勾选。未完成使用浅灰圆圈。

### AgentCard

显示 AI 员工。结构：

```text
头像
姓名
角色
状态
```

AI 员工不是聊天气泡，而是办公室里的角色。

### ProgressCard

显示项目进度。使用横向进度条。每张卡片最多展示 4 个项目。

### MemoryCard

显示一段记忆。结构：

```text
图片
时间
标签
标题
一句话摘要
收藏状态
```

点击打开记忆详情。

### CitySwitchMap

用于城市切换。城市不是普通 Tab，而是空间节点。交互是缩小当前城市，进入世界地图，选择目标城市，再放大进入。

## Do's and Don'ts

### Do

- 使用白色卡片和浅色背景。
- 保持 City Pop 白天感。
- 保持轻像素 / 2.5D 视觉。
- 让每个页面像一个真实空间。
- 让数据以状态、等级、建筑、进度出现。
- 让 AI 员工以角色形式出现。
- 让记忆以地点、时间、照片和故事出现。

### Don't

- 不要在用户界面中出现 Layer 0 / Layer 1 / Layer 2。
- 不要展示数据结构字段。
- 不要把技术架构放进 UI。
- 不要做成暗黑科幻仪表盘。
- 不要做成纯手游 UI。
- 不要做太多货币、红点、抽奖式反馈。
- 不要让用户感觉自己在填写数据库。
- 不要把 AI 员工做成普通聊天机器人列表。

## Page Rules

### WorldPage

主视觉是岛屿城市。建筑必须可点击：

```text
家
办公室
记忆馆
财务楼
生活区
AI 研究所
```

世界页的目标是让用户感到“我的世界正在生长”。

### OfficePage

主视觉是办公室室内。核心卡片：

```text
今日任务
AI 员工
项目进度
本月数据
```

办公室的目标是成为用户每日工作入口。

### MemoryPage

主视觉是记忆馆室内。核心卡片：

```text
记忆流
时间轴
地点分类
AI 记忆助手
```

记忆馆不是相册，是可探索的人生空间。

### FinancePage

主视觉是财务楼。核心卡片：

```text
总资产
收入来源
支出结构
城市资金分布
```

财务数据要清晰，不要过度游戏化。

### LifePage

主视觉是生活区。核心卡片：

```text
睡眠
运动
恢复
环境
```

生活区表达真实身体状态如何影响数字世界。

## Implementation Guidance

前端优先使用组件化结构：

```text
AppShell
TopBar
Sidebar
SceneCard
RightInfoPanel
TaskCard
AgentCard
ProgressCard
MemoryCard
Timeline
```

第一版可以使用静态场景图。后续再替换为 Canvas / WebGL / Godot 渲染。

CSS 默认使用 `src/styles.css` 中的基础变量。当前代码仍保留 `--bg-main`、`--bg-card`、`--bg-soft` 这组已经落地的命名；不要新增另一套 `--color-bg` / `--color-surface` 别名，避免设计系统漂移。

## Product Tone

这不是一个数据仪表盘，而是一个“可进入的个人世界”。

用户应该感觉：

```text
我在管理我的 AI 公司。
我在进入我的记忆空间。
我的城市和建筑在根据真实生活成长。
我的人生不是散落的数据，而是一个正在形成的世界。
```
