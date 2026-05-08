---
version: alpha
name: Me Inc. World OS
description: 白色系统界面 + City Pop 像素游戏世界 + Mac 原生 App 质感。当前主分支落地为 React / Vite / Tauri / Swift sidecar / Godot 的本地优先 Memory Map。
techStack:
  frontend: "React 19 + TypeScript 5.9 + Vite 7"
  desktopShell: "Tauri 2 + Rust + SQLite"
  nativeImport: "Swift 6 sidecar on macOS 14"
  gameLayer: "Godot 4.6, consuming generated world_state.json"
  maps: "Mapbox GL frontend dependency + Amap Web Service evidence flow"
  ai: "Hermes gateway or local OpenAI-compatible Hermes API, optional by env"
  storage: "SQLite in Tauri production, localStorage only for web preview"
  tests: "Vitest in node environment + react-dom/server snapshots"
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

这份文档同时是设计说明和 token 源文件。YAML front matter 会被 `scripts/export-design-tokens.mjs` 生成到 `src/design-tokens.css`，`npm run build` 会先执行 `npm run design:tokens:check`。不要手改生成后的 CSS token。

## Current Main Stack

当前主分支不是纯网页原型，而是一个本地优先的 Mac / Web 双态应用：

- 前端壳：`React 19`、`TypeScript 5.9`、`Vite 7`，入口在 `src/main.tsx`，页面状态由 `src/viewRoutes.ts` 和 `window.history` 管理，当前没有引入 React Router。
- 样式系统：原生 CSS，`src/styles.css` 只导入 `src/design-tokens.css` 并使用 CSS variables；当前没有 Tailwind、shadcn、CSS-in-JS 或组件库。
- 桌面壳：`Tauri 2`，默认窗口 `1440 x 960`，最小 `1120 x 760`。Rust command 负责初始化 SQLite，并通过 sidecar 触发原生媒体导入。
- 原生导入：`native/MemoryMapSidecar` 是 Swift 6 / macOS 14 sidecar，使用 ImageIO / CoreGraphics 生成缩略图，用 SHA-256 去重，并写入 SQLite。
- 游戏层：`godot/` 是 Godot 4.6 原型，边界是 Layer 3。它读取 `godot/data/world_state.json`，该文件由 `npm run export:godot` 从 TypeScript 数据导出。
- 地图与地点证据：依赖 `mapbox-gl`，中国地址流使用 Amap Web Service，将 EXIF WGS84 转 GCJ-02 后反查地址。`VITE_MAPBOX_TOKEN` 和 `VITE_AMAP_KEY` 都是可选环境配置。
- AI 语义：Hermes 是可选网关。媒体分析走 `VITE_HERMES_GATEWAY_URL`，图片意义可以走 `VITE_HERMES_API_BASE_URL` + `VITE_HERMES_API_KEY`。没有配置时 UI 必须保持可用并显示本地/离线状态。
- 测试：Vitest 使用 node 环境，React 页面主要通过 `react-dom/server` 渲染断言；设计 token 同步也有测试覆盖。

## Current Surface

当前已落地的路由只有四个：

```text
/              WorldPage
/office        OfficePage
/memory        MemoryPage / MemoryLibraryDashboard
/memory/import MemoryImportPage / Image Import Workbench
```

财务楼、生活区、AI 研究所、家目前是世界地图节点和侧边栏入口，不是已实现的完整页面。文档可以继续规定它们的目标体验，但实现时必须先补 `ViewKey`、路由、页面组件和测试。

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

全局优先使用 Mac App 式三栏结构：

```text
TopBar
Sidebar | Main Content | Optional Right Rail
```

桌面端基准：

- Tauri 默认窗口是 1440px / 960px，最小窗口是 1120px / 760px；网页开发态继续适配 1440px / 1536px / 1728px。
- 左侧 Sidebar：160px。
- 右侧信息栏：220px 到 280px，当前实现 248px。
- 主内容区自适应。
- 卡片间距：12px 到 16px。
- 页面外边距：16px 到 24px。
- 页面容器可以使用 `100vw` / `100vh` 与内部 `overflow: auto`，但固定格式区域要用 `aspect-ratio`、`minmax()`、稳定高度或 CSS 变量避免内容抖动。

主内容区结构：

```text
Scene Card
Function Cards
```

不同页面使用同一布局：

- 世界：首页大岛屿场景 + 今日状态 + 城市入口。
- 办公室：办公室室内场景 + 今日任务 / AI 员工 / 项目进度 / 本月数据。
- 记忆馆：记忆室场景 + 记忆卡片 / 城市分布 / Hermes 状态 / 导入入口。
- 导入记忆：独立工作台 + 批量上传状态 + EXIF/Amap/Hermes 证据 + 世界同步状态。
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

页面总容器。背景使用 `bg-main`。当前实现由 `TopBar`、`Sidebar`、主内容区和可选 `right-rail` 组成。没有右栏的页面使用 wide 变体，不要为了填满布局塞入无意义卡片。

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
导入记忆
财务楼
生活区
AI 研究所
任务
设置
```

当前页面必须有明显 active 状态。Active 使用 `primary-strong` 背景以保证白字对比度。没有路由的导航项可以保留视觉入口，但不能伪装成已完成页面。

### SceneCard

每个页面的视觉核心。显示当前空间：

- 世界地图：岛屿城市。
- 办公室：室内办公空间。
- 记忆馆：照片墙、记忆桌、回忆图谱。
- 财务楼：数据屏幕、资产流向。
- 生活区：花园、健身、恢复空间。
- AI 研究所：AI 实验室、模型训练屏幕。

SceneCard 当前使用静态 raster 场景图和像素 sprite 层。React 页面不要直接重写 Godot 的交互世界；需要真实移动、房间、天气、生长、解锁时，由 Godot Layer 3 读取 `world_state.json` 承担。

### InfoPanel

右侧信息栏，对应当前代码里的 `rightRail`。它显示当前空间属性与升级信息，属于可选区域。专注导入、编辑、复核的工作台页面可以不显示右栏。

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

### MemoryImportWorkbench

导入记忆是独立页面，不要塞进记忆馆主卡片里。当前工作台支持图片导入，批量上传支持逐张处理进度。核心状态按四步呈现：

```text
选择图片
读取证据
生成信息
同步世界
```

证据展示必须区分硬事实和候选解释：EXIF GPS 是硬证据，Amap 地址、视觉摘要、文件名主题是辅助证据。没有真实坐标时，不要在地图或世界状态里生成硬事实点位。

### EvidenceCard

用于 EXIF、地址、Hermes 图片意义、世界同步等证据块。它必须显示状态、来源和用户能理解的一句话解释。可以显示 `gps_exif`、`amap`、`Hermes`、`world_state.json` 这类技术来源，但不要让用户看到原始数据库字段。

### HermesStatusCard

Hermes 是可选能力，不是页面加载前提。未配置网关时，状态应显示离线 / 本地 payload 就绪，并继续允许用户导入、建卡和浏览记忆。

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
- 使用 `DESIGN.md` 中的 token，运行生成脚本同步到 `src/design-tokens.css`。
- 把原始媒体、SQLite 路径、API key 留在本地实现层，只在 UI 中显示语义摘要和状态。
- 让 Godot 只消费稳定后的 `world_state.json` 和资产 manifest。

### Don't

- 不要在用户界面中出现 Layer 0 / Layer 1 / Layer 2。
- 不要展示数据结构字段。
- 不要把技术架构放进 UI。
- 不要做成暗黑科幻仪表盘。
- 不要做成纯手游 UI。
- 不要做太多货币、红点、抽奖式反馈。
- 不要让用户感觉自己在填写数据库。
- 不要把 AI 员工做成普通聊天机器人列表。
- 不要新增另一套 `--color-bg` / `--color-surface` 等 token 别名。
- 不要手动修改 `src/design-tokens.css`。
- 不要在没有迁移计划时引入 Tailwind、shadcn、CSS-in-JS 或新的 UI 组件库。
- 不要让 Godot、Hermes 或 Mapbox 直接读取原始照片、音频、SQLite 文件路径或完整隐私数据。

## Page Rules

### WorldPage

主视觉是岛屿城市。当前 `/` 已实现世界地图、TopBar、Sidebar、右侧城市状态和底部功能卡。建筑视觉节点包括：

```text
家
办公室
记忆馆
财务楼
生活区
AI 研究所
```

当前已可点击进入的是办公室和记忆馆；其他建筑作为世界状态目标保留。世界页的目标是让用户感到“我的世界正在生长”。

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

主视觉是记忆馆室内。当前 `/memory` 是记忆库页面，核心卡片：

```text
记忆馆场景
批量导入
2024 年记忆
城市分布
Hermes 状态
导入记忆入口
```

记忆馆不是相册，是可探索的人生空间。

### MemoryImportPage

`/memory/import` 是图片导入工作台。它不是普通表单，而是证据流水线：

```text
选择 HEIC / JPEG / PNG
读取 EXIF GPS
请求 Amap 地址候选
请求 Hermes 图片意义
生成 MemoryItem / EventMeaning
等待同地点证据达到同步阈值
```

导入体验必须自动化、可解释、可回退。用户不应该被迫填写标题、主题或数据库字段。批量导入时必须展示进度、失败项和当前处理文件。

### FinancePage

目标页，当前主分支尚未实现路由。主视觉是财务楼。核心卡片：

```text
总资产
收入来源
支出结构
城市资金分布
```

财务数据要清晰，不要过度游戏化。

### LifePage

目标页，当前主分支尚未实现路由。主视觉是生活区。核心卡片：

```text
睡眠
运动
恢复
环境
```

生活区表达真实身体状态如何影响数字世界。

### AIResearchPage

目标页，当前主分支尚未实现路由。AI 研究所表达 Hermes / Agent 能力，但不要做成普通聊天列表。核心卡片：

```text
AI 员工
Hermes 任务
技能进化
自动化队列
世界解释
```

## Implementation Guidance

当前代码边界：

- `src/domain` 放纯 TypeScript 领域模型、世界生成、地点画像、同步阈值和测试。
- `src/integrations` 放 Amap、EXIF、Hermes、localStore、Godot world state 等外部边界。
- `src/components` 放可复用 React 组件，例如 `AppShell`、`MemoryRoom`。
- `src/App.tsx` 目前仍承担页面编排和导入工作台逻辑；后续变大时优先按页面拆分，不要把新业务继续堆进同一个文件。
- `src-tauri` 放 Tauri / Rust / SQLite command。
- `native/MemoryMapSidecar` 放 Swift 原生媒体导入。
- `godot` 放 Layer 3 游戏世界原型。

前端优先使用当前已落地的组件结构：

```text
AppShell
TopBar
Sidebar
DesignCard
SceneCard
RightInfoPanel
TaskCard
AgentCard
ProgressCard
MemoryCard
MemoryImportWorkbench
EvidenceCard
Timeline
```

第一版 React 页面使用静态场景图、sprite PNG 和 CSS 布局。后续如果要嵌入真正可移动的世界，不要在 React 中手写一套游戏引擎；应让 Godot Web export 或 Godot native sidecar 承担 Layer 3。

CSS 默认使用 `src/styles.css`，并从 `src/design-tokens.css` 读取变量。当前代码保留 `--bg-main`、`--bg-card`、`--bg-soft` 这组已经落地的命名；不要新增另一套 `--color-bg` / `--color-surface` 别名，避免设计系统漂移。

常用命令：

```bash
npm run design:tokens
npm run design:tokens:check
npm run export:godot
npm run test
npm run build
npm run tauri
```

环境变量：

```text
VITE_MAPBOX_TOKEN
VITE_AMAP_KEY
VITE_HERMES_GATEWAY_URL
VITE_HERMES_API_BASE_URL
VITE_HERMES_API_KEY
```

资产约定：

- `public/assets/generated/v2/sprites` 是当前主 UI / 世界节点 sprite 来源。
- `public/assets/generated/v2/addon-sprites` 是按钮、徽章、图标、卡片底图等辅助 sprite。
- `public/assets/game/sprites` 是世界地图 cut sprite。
- `public/assets/office-room` 和 `public/assets/memory-room` 是页面 scene 背景。
- `godot/assets` 只服务 Godot 项目，不要直接依赖其 `.import` 文件作为 Web UI 资产。

## Product Tone

这不是一个数据仪表盘，而是一个“可进入的个人世界”。

用户应该感觉：

```text
我在管理我的 AI 公司。
我在进入我的记忆空间。
我的城市和建筑在根据真实生活成长。
我的人生不是散落的数据，而是一个正在形成的世界。
```
