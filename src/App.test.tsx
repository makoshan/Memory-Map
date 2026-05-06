import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import App, {
  buildImageImportProgressSteps,
  createArchiveProcessingFile,
  getPathForView,
  getViewFromPathname,
  MemoryCreatePage,
  MemoryImportPage,
  OfficeDashboardPage
} from "./App";

describe("App", () => {
  it("starts on the island home instead of mixing subpages into the first screen", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("app-shell world-dashboard");
    expect(html).toContain("top-bar");
    expect(html).toContain("side-nav");
    expect(html).toContain("right-rail");
    expect(html).toContain("main-stage world-stage");
    expect(html).toContain("Alex Chen");
    expect(html).toContain("我的世界");
    expect(html).toContain("世界地图");
    expect(html).toContain("城市状态");
    expect(html).toContain("/assets/game/sprites/office-island.png");
    expect(html).toContain("/assets/game/sprites/memory-museum-island.png");
    expect(html).toContain("/assets/game/sprites/finance-tower-island.png");
    expect(html).toContain("/assets/game/sprites/recovery-garden-island.png");
    expect(html).toContain("/assets/game/sprites/home-base-island.png");
    expect(html).toContain("/assets/game/sprites/ai-research-lab-island.png");
    expect(html).toContain("/assets/game/sprites/lighthouse-island.png");
    expect(html).toContain("/assets/game/sprites/wood-bridge.png");
    expect(html).toContain("/assets/game/sprites/player-alex.png");
    expect(html).toContain("/assets/ai-company/office.png");
    expect(html).toContain("/assets/ai-company/memory.png");
    expect(html).toContain("/assets/ai-company/finance.png");
    expect(html).toContain("/assets/ai-company/daily.png");
    expect(html).toContain("/assets/ai-company/worldmap.png");
    expect(html).toContain("/assets/ai-company/timeline.png");
    expect(html).toContain("24°C");
    expect(html).toContain("晴 · 空气优 28");
    expect(html).toContain("世界地图");
    expect(html).toContain("进入办公室");
    expect(html).toContain("进入记忆馆");
    expect(html).toContain('href="/office"');
    expect(html).toContain('href="/memory"');
    expect(html).not.toContain("Memory Map 产品首页设计图");
    expect(html).not.toContain("2. 进入建筑");
    expect(html).not.toContain("3. 记忆馆");
    expect(html).not.toContain("4. 财务楼");
    expect(html).not.toContain("5. 今日页");
    expect(html).not.toContain("6. 世界地图");
    expect(html).not.toContain("7. 人生轨迹");
    expect(html).not.toContain("图片导入工作台");
    expect(html).not.toContain("建筑属性");
    expect(html).not.toContain("Memory Map Production Console");
    expect(html).not.toContain("Hermes Agent");
  });

  it("renders the office dashboard as a child page", () => {
    const html = renderToStaticMarkup(<OfficeDashboardPage onNavigate={() => undefined} />);

    expect(html).toContain("app-shell office-dashboard");
    expect(html).toContain("top-bar");
    expect(html).toContain("side-nav");
    expect(html).toContain("right-rail");
    expect(html).toContain("main-stage");
    expect(html).toContain("办公室");
    expect(html).toContain("建筑属性");
    expect(html).toContain("升级效果");
    expect(html).toContain("今日任务");
    expect(html).toContain("AI 员工");
    expect(html).toContain("项目进度");
    expect(html).toContain("本月数据");
    expect(html).toContain("返回岛屿");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/memory"');
    expect(html).not.toContain("图片导入工作台");
  });

  it("ships the AI company web design v0.1 guide and CSS tokens", () => {
    const designDoc = readFileSync("docs/design/ai-company-web-design-v0.1.md", "utf8");
    const css = readFileSync("src/styles.css", "utf8");
    const generatedTokens = readFileSync("src/design-tokens.css", "utf8");

    expect(designDoc).toContain("一个人的 AI 公司：网页设计规范 v0.1");
    expect(designDoc).toContain("白色系统界面 + City Pop 像素游戏世界 + Mac 原生 App 质感");
    expect(designDoc).toContain("AppShell");
    expect(designDoc).toContain("TopBar");
    expect(designDoc).toContain("Sidebar");
    expect(generatedTokens).toContain("--bg-main: #F7F8FB");
    expect(generatedTokens).toContain("--primary: #4B9CFF");
    expect(css).toContain(".app-shell");
    expect(css).toContain(".design-card");
    expect(css).toContain(".button-primary");
  });

  it("renders the memory library as a standalone child page", () => {
    const html = renderToStaticMarkup(<MemoryImportPage onNavigate={() => undefined} />);

    expect(html).toContain("记忆馆");
    expect(html).toContain("2024 年记忆");
    expect(html).toContain("杭州刘小龙展会看机器人");
    expect(html).toContain("城市分布");
    expect(html).toContain("导入记忆");
    expect(html).toContain('href="/memory/import"');
    expect(html).toContain("返回岛屿");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/office"');
    expect(html).not.toContain("图片导入工作台");
    expect(html).not.toContain("Memory Map Production Console");
  });

  it("keeps the image import workbench inside a dedicated import page", () => {
    const html = renderToStaticMarkup(<MemoryCreatePage onNavigate={() => undefined} />);

    expect(html).toContain("导入图片记忆");
    expect(html).toContain("图片导入工作台");
    expect(html).toContain("自动导入模式");
    expect(html).toContain("Step 1");
    expect(html).toContain("导入图片");
    expect(html).toContain("批量上传");
    expect(html).toContain("上传进度");
    expect(html).toContain("错误");
    expect(html).toContain("预览结果");
    expect(html).toContain("等待批量选择图片");
    expect(html).toMatch(/选择 HEIC \/ JPEG 图片|拖入 \/ 粘贴 \/ 选择图片后自动生成事件/);
    expect(html).toContain("multiple");
    expect(html).toContain('data-drop-state="idle"');
    expect(html).toContain("导入进度");
    expect(html).toContain("选择图片");
    expect(html).toContain("读取证据");
    expect(html).toContain("生成信息");
    expect(html).toContain("同步世界");
    expect(html).toContain("未选择图片");
    expect(html).toMatch(/等待选择图片后生成|等待图片进入页面后自动生成/);
    expect(html).toContain("EXIF GPS");
    expect(html).toContain("暂无坐标证据");
    expect(html).toContain("未读取到真实 EXIF GPS 前，不生成硬事实点位。");
    expect(html).toContain("地址证据");
    expect(html).toContain("等待真实坐标后再请求地址候选。");
    expect(html).toMatch(/意义确认|意义自动生成/);
    expect(html).toContain("等待文件生成事件标题");
    expect(html).toContain("证据审查");
    expect(html).toMatch(/生成记忆事件|自动生成记忆事件/);
    expect(html).not.toContain("用户笔记");
    expect(html).toContain("Mapbox");
    expect(html).toContain("Godot world_state.json");
    expect(html).toContain("未同步");
    expect(html).toContain("返回记忆库");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/memory"');
    expect(html).toContain('href="/office"');
    expect(html).not.toContain("2024 年记忆");
    expect(html).not.toContain("当前样例");
    expect(html).not.toContain("IMG_9128.HEIC");
    expect(html).not.toContain("Apple iPhone 16 Pro");
    expect(html).not.toContain("2026-05-03 16:13:13");
    expect(html).not.toContain("robot / smart hardware / exhibition display");
    expect(html).not.toContain("杭州刘小龙展会");
    expect(html).not.toContain("120.1285694444");
    expect(html).not.toContain("30.2777888889");
    expect(html).not.toContain("颐高创业");
    expect(html).not.toContain("robotics");
    expect(html).not.toContain("Memory Map 产品设计图");
    expect(html).not.toContain("支持照片 · 音频 · 笔记");
    expect(html).not.toContain("支持照片 · 音频 · 笔记");
    expect(html).not.toContain("MP3");
    expect(html).not.toContain("城市分布");
    expect(html).not.toContain("AI 总结");
    expect(html).not.toContain("最近导入");
    expect(html).not.toContain("展开：单文件意义工作台");
    expect(html).not.toContain("Hermes Agent");
  });

  it("keeps import progress waiting for supplemental evidence when an image has no usable GPS", () => {
    const steps = buildImageImportProgressSteps({
      hasImage: true,
      hasGpsEvidence: false,
      exifStatus: "missing",
      meaningGenerated: false
    });

    expect(steps).toEqual([
      { label: "选择图片", detail: "图片已载入本地工作台", state: "done" },
      { label: "读取证据", detail: "未得到可用 GPS，等待补充证据", state: "warning" },
      { label: "生成信息", detail: "等待补充证据后生成", state: "pending" },
      { label: "同步世界", detail: "等待 EventMeaning 生成后进入聚合", state: "pending" }
    ]);
  });

  it("keeps world sync pending after EventMeaning generation until place evidence reaches the threshold", () => {
    const steps = buildImageImportProgressSteps({
      hasImage: true,
      hasGpsEvidence: true,
      exifStatus: "found",
      meaningGenerated: true
    });

    expect(steps.at(-1)).toEqual({
      label: "同步世界",
      detail: "等待地点画像达到 10 张阈值",
      state: "pending"
    });
  });

  it("uses persistent image data URLs for archived memory thumbnails", () => {
    const file = createArchiveProcessingFile({
      name: "photo.jpeg",
      size: 100,
      type: "image/jpeg",
      lastModified: new Date("2026-05-05T10:00:00Z").getTime(),
      previewUrl: "blob:http://localhost/temp",
      dataUrl: "data:image/jpeg;base64,AAAA"
    });

    expect(file.previewUrl).toBe("data:image/jpeg;base64,AAAA");
  });

  it("maps top-level views to standalone URLs", () => {
    expect(getPathForView("world")).toBe("/");
    expect(getPathForView("office")).toBe("/office");
    expect(getPathForView("memory")).toBe("/memory");
    expect(getPathForView("memoryImport")).toBe("/memory/import");
    expect(getViewFromPathname("/")).toBe("world");
    expect(getViewFromPathname("/office")).toBe("office");
    expect(getViewFromPathname("/memory")).toBe("memory");
    expect(getViewFromPathname("/memory/")).toBe("memory");
    expect(getViewFromPathname("/memory/import")).toBe("memoryImport");
    expect(getViewFromPathname("/memory/import/")).toBe("memoryImport");
    expect(getViewFromPathname("/unknown")).toBe("world");
  });
});
