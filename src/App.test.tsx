import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import App, {
  getPathForView,
  getViewFromPathname,
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

  it("keeps the image import workbench inside the memory child page", () => {
    const html = renderToStaticMarkup(<MemoryImportPage onNavigate={() => undefined} />);

    expect(html).toContain("记忆馆");
    expect(html).toContain("图片导入工作台");
    expect(html).toContain("IMG_9128.HEIC");
    expect(html).toContain("EXIF GPS");
    expect(html).toContain("30.2777888889");
    expect(html).toContain("高德地址");
    expect(html).toContain("颐高创业");
    expect(html).toContain("意义确认");
    expect(html).toContain("杭州刘小龙展会看机器人");
    expect(html).toContain("robotics");
    expect(html).toContain("证据审查");
    expect(html).toContain("gps_exif");
    expect(html).toContain("Mapbox");
    expect(html).toContain("Godot world_state.json");
    expect(html).toContain("硬事实不会被笔记覆盖");
    expect(html).toContain("返回岛屿");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/office"');
    expect(html).not.toContain("Hermes Agent");
  });

  it("maps top-level views to standalone URLs", () => {
    expect(getPathForView("world")).toBe("/");
    expect(getPathForView("office")).toBe("/office");
    expect(getPathForView("memory")).toBe("/memory");
    expect(getViewFromPathname("/")).toBe("world");
    expect(getViewFromPathname("/office")).toBe("office");
    expect(getViewFromPathname("/memory")).toBe("memory");
    expect(getViewFromPathname("/memory/")).toBe("memory");
    expect(getViewFromPathname("/unknown")).toBe("world");
  });
});
