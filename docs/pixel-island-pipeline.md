# Pixel Island Pack Pipeline

这条流水线把“用户图片/素材风格 -> 背景图 -> 素材 atlas -> 独立 sprites -> 首页拼装数据”固定成可复用产物。

## 产物结构

以 `hangzhou` 为例：

- `public/assets/generated/v2/hangzhou-background.png`: 像素岛屿底图
- `public/assets/generated/v2/hangzhou-background.prompt.txt`: 背景生成提示词
- `public/assets/generated/v2/hangzhou-atlas-raw.png`: 原始素材 atlas
- `public/assets/generated/v2/hangzhou-atlas.png`: 透明背景 atlas
- `public/assets/generated/v2/hangzhou-sprites/`: 自动切出的独立 PNG
- `public/assets/generated/v2/hangzhou-sprites/manifest.json`: sprite 元数据
- `public/assets/generated/v2/hangzhou-sprites-preview.png`: 编号切图预览
- `public/assets/generated/v2/hangzhou-island-composite-preview.png`: 背景 + sprites 的最终舞台图；前端优先使用它做视觉基底
- `public/assets/generated/v2/hangzhou-pack.json`: 可给前端/Godot 使用的 pack 数据

## 使用方式

先用图像生成模型生成两张图：

1. 背景图：无 UI、无文字、无主建筑，保留岛屿空位。
2. 素材 atlas：纯 `#FF00FF` 或接近纯品红背景，元素之间留足间距。

然后运行：

```bash
npm run generate:pixel-island -- \
  --slug hangzhou \
  --city Hangzhou \
  --theme "personal AI company" \
  --raw-background /path/to/background.png \
  --raw-atlas /path/to/atlas-raw.png \
  --output-root public/assets/generated/v2 \
  --mirror-root dist/assets/generated/v2
```

首页当前使用 `src/data/pixelIslandPacks.ts` 中的 `hangzhouPixelIslandPack`。未来每个用户可以生成自己的 `<slug>-pack.json`，再把 pack 数据映射到相同的 `PixelIslandPack` 结构里渲染。

前端渲染原则：

1. `sceneImage` 是最终视觉层，避免浏览器现场拼接时比例漂移。
2. `sprites/manifest.json` 仍然保留，供热点、Godot、二次编辑和重新合成使用。
3. UI 标签、地图切换、今日状态等运行时控件覆盖在 `sceneImage` 上，不烘焙进生成图。

## 当前素材评估

`dist/assets/generated/v2` 目前有三组可复用资产：

- `hangzhou-background.png`: 杭州像素岛屿背景，适合做首页舞台底图。
- `hangzhou-sprites/`: 35 个杭州主题切图，包含主建筑、桥、船、树、角色和 AI 机器人。
- `addon-sprites/` 与 `sprites/`: 通用 UI 图标、按钮、船、灯、树、卡片底板等辅助元素。

这已经足够支撑当前首页的“杭州像素岛屿 + 热点 + 今日状态 + Mapbox 切换”。但如果要继续贴近最终稿，还需要下一批更工程化的素材，而不是继续从最终稿截图：

- 前景遮挡层：树冠、桥栏、码头边缘、水面高光，解决角色和建筑前后关系。
- 阴影/接地层：每个建筑和道具独立的软阴影，避免漂浮感。
- 岛屿空位锚点：背景生成时同步输出每个岛屿 pad 的 `x/y/width/height/zIndex`。
- 标签锚点：每个建筑的推荐气泡位置，减少前端手调。
- 2x/3x 资产：同一 pack 保留高分辨率源图，前端使用合成图，编辑器/Godot 使用独立 sprites。

## 推荐生成流程

后续每个用户走同一条流水线：

1. 用户输入图片、音频、笔记后，先生成用户画像摘要：城市、时间段、核心地点、常见人物、主题关键词。
2. 用画像摘要生成 `background`：只画城市湖湾、天际线、岛屿 pad、水面、远景，不画 UI 和文字。
3. 用同一份画像摘要生成 `atlas`：建筑、人物、交通、自然物、特殊记忆道具，统一视角和光照，品红背景方便切图。
4. `scripts/pixel_island_pipeline.py` 自动切图、写 manifest、按 pack 布局合成 `sceneImage`。
5. React 首页只把 `sceneImage` 当视觉底图；交互层读取 pack 的 hotspots/labels/status/map 切换。
6. 如果视觉不贴合，只调整生成提示词、锚点和合成规则，再重新跑 pipeline；不把设计稿截图塞进页面。

## 为什么前端优先用合成图

浏览器逐个 sprite 现场拼接会受到容器比例、图片原始尺寸、缩放算法和 z-index 的影响，容易出现“当前图 1”那种位置漂移。pipeline 先在 Python 里用同一套 pack 数据合成 `sceneImage`，前端再覆盖热点和状态 UI，可以同时保留素材可编辑性和最终画面的稳定性。
