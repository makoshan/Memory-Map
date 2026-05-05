import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import productDesign from "../docs/产品设计图.png";
import { AppShell, DesignCard, type NavigateHandler } from "./components/AppShell";
import { MemoryRoomDashboard } from "./components/MemoryRoom";
import { gameAssets } from "./data/gameAssets";
import { robotExhibitionMeaning } from "./data/sampleData";
import { getPathForView, getViewFromPathname, type ViewKey } from "./viewRoutes";

export { getPathForView, getViewFromPathname } from "./viewRoutes";

const officeScene = "/assets/office-room/office_scene.jpg";
const aiCompanyAssets = {
  island: "/assets/ai-company/island.png",
  office: "/assets/ai-company/office.png",
  memory: "/assets/ai-company/memory.png",
  finance: "/assets/ai-company/finance.png",
  worldmap: "/assets/ai-company/worldmap.png",
  daily: "/assets/ai-company/daily.png",
  timeline: "/assets/ai-company/timeline.png"
} as const;

type IslandSpot = {
  key: string;
  label: string;
  level: string;
  icon: string;
  sprite: string;
  view?: ViewKey;
  className: string;
  ariaLabel?: string;
};

const islandSpots: IslandSpot[] = [
  { key: "office", label: "办公室", level: "Lv.8", icon: gameAssets.icons.office, sprite: gameAssets.cut.office, view: "office", className: "spot-office", ariaLabel: "进入办公室" },
  { key: "memory", label: "记忆馆", level: "Lv.7", icon: gameAssets.icons.memory, sprite: gameAssets.cut.memory, view: "memory", className: "spot-memory", ariaLabel: "进入记忆馆" },
  { key: "finance", label: "财务楼", level: "Lv.6", icon: gameAssets.icons.finance, sprite: gameAssets.cut.finance, className: "spot-finance" },
  { key: "ai", label: "AI 研究所", level: "Lv.7", icon: gameAssets.icons.ai, sprite: gameAssets.cut.aiLab, className: "spot-ai" },
  { key: "home", label: "家", level: "Lv.10", icon: gameAssets.icons.home, sprite: gameAssets.cut.home, className: "spot-home" },
  { key: "life", label: "生活区", level: "Lv.5", icon: gameAssets.icons.life, sprite: gameAssets.cut.recovery, className: "spot-life" }
];

const tasks = [
  ["10:00", "产品设计评审", true],
  ["14:00", "AI 研究进展同步", true],
  ["16:00", "财务月度分析", false],
  ["19:00", "运动 · 跑步 5km", false],
] as const;

const employees = [
  ["Emma", "研究员", "项目研究", gameAssets.cut.agents.researcher, "online"],
  ["Lily", "设计师", "界面设计", gameAssets.cut.agents.designer, "online"],
  ["Max", "分析师", "数据分析", gameAssets.cut.agents.analyst, "online"],
  ["David", "数据师", "数据处理", gameAssets.cut.agents.data, "away"],
  ["Kate", "助理", "设计支持", gameAssets.cut.agents.assistant, "online"],
  ["Bot-01", "执行助手", "执行中", gameAssets.cut.agents.bot, "online"],
] as const;

const projects = [
  ["AI 产品优化项目", 72],
  ["用户研究分析", 58],
  ["数据模型训练", 45],
  ["市场调研报告", 28],
] as const;

const chartPoints = [10, 24, 44, 36, 64, 78, 72, 58, 92, 82, 70, 68, 78];

const exifGps = {
  latitude: "30.2777888889",
  longitude: "120.1285694444",
  altitude: "11.18 m",
  horizontalError: "21.30 m",
  capturedAt: "2026-05-03 16:13:13",
  device: "Apple iPhone 16 Pro"
};

const amapEvidence = {
  converted: "120.133333062066, 30.275500488282",
  address: "浙江省杭州市西湖区翠苑街道黄姑山路39号颐高创业",
  pois: ["颐高广场A座", "颐高创业大厦", "昌地·火炬大厦"],
  road: "黄姑山路"
};

const visualHints = ["robot", "smart hardware", "exhibition display"];

function EvidenceCard({
  title,
  status,
  children
}: {
  title: string;
  status: string;
  children: ReactNode;
}) {
  return (
    <article className="evidence-card">
      <header>
        <strong>{title}</strong>
        <span>{status}</span>
      </header>
      {children}
    </article>
  );
}

function WorldSceneCard({ onNavigate }: { onNavigate: NavigateHandler }) {
  return (
    <DesignCard className="scene-card world-scene-card">
      <div className="ai-world-scene" role="img" aria-label="像素风岛屿世界地图">
        <div className="ai-world-skyline" aria-hidden="true" />
        <img className="ai-world-bridge ai-bridge-home-life" src={gameAssets.cut.woodBridge} alt="" aria-hidden="true" />
        <img className="ai-world-bridge ai-bridge-home-ai" src={gameAssets.cut.woodBridge} alt="" aria-hidden="true" />
        <img className="ai-world-bridge ai-bridge-memory-home" src={gameAssets.cut.woodBridge} alt="" aria-hidden="true" />
        {islandSpots.map((spot) => {
          const content = (
            <>
              <img className="ai-spot-sprite" src={spot.sprite} alt="" />
              <span className="ai-spot-label">
                <img src={spot.icon} alt="" />
                <strong>{spot.label}</strong>
                <em>{spot.level}</em>
              </span>
            </>
          );

          if (spot.view) {
            return (
              <a
                key={spot.key}
                className={`ai-world-spot ${spot.className}`}
                href={getPathForView(spot.view)}
                onClick={(event) => onNavigate(spot.view!, event)}
                aria-label={spot.ariaLabel ?? spot.label}
              >
                {content}
              </a>
            );
          }

          return (
            <div key={spot.key} className={`ai-world-spot ${spot.className}`}>
              {content}
            </div>
          );
        })}
        <img className="ai-world-prop ai-world-lighthouse" src={gameAssets.cut.lighthouse} alt="" aria-hidden="true" />
        <img className="ai-world-prop ai-world-reed" src={gameAssets.cut.reedPatch} alt="" aria-hidden="true" />
        <img className="ai-world-prop ai-world-flower" src={gameAssets.cut.flowerPatch} alt="" aria-hidden="true" />
        <img className="ai-world-character ai-world-player" src={gameAssets.cut.playerAlex} alt="" aria-hidden="true" />
        <img className="ai-world-character ai-world-agent-1" src={gameAssets.cut.agents.researcher} alt="" aria-hidden="true" />
        <img className="ai-world-character ai-world-agent-2" src={gameAssets.cut.agents.analyst} alt="" aria-hidden="true" />
      </div>
      <article className="scene-info world-scene-info">
        <header>
          <h1>我的世界</h1>
          <span>城市 Lv.10</span>
        </header>
        <p className="scene-progress">Day 10,532</p>
        <div className="progress-track"><i style={{ width: "68%" }} /></div>
        <p>一个人的 AI 公司在白天的岛屿城市里运转。点击办公室或记忆馆进入真实空间。</p>
      </article>
      <a className="button-primary world-office-entry" href="/office" onClick={(event) => onNavigate("office", event)}>进入办公室</a>
    </DesignCard>
  );
}

function WorldBottomGrid({ onNavigate }: { onNavigate: NavigateHandler }) {
  return (
    <div className="bottom-grid world-bottom-grid">
      <DesignCard className="dashboard-card world-summary-card" as="article">
        <h2>今日任务</h2>
        <img src={aiCompanyAssets.daily} alt="今日任务概览" />
        <p><strong>2/4</strong><span>已完成</span></p>
      </DesignCard>
      <DesignCard className="dashboard-card world-summary-card" as="article">
        <h2>办公室</h2>
        <a href="/office" onClick={(event) => onNavigate("office", event)}>
          <img src={aiCompanyAssets.office} alt="办公室概览" />
        </a>
        <p><strong>125%</strong><span>当前效率</span></p>
      </DesignCard>
      <DesignCard className="dashboard-card world-summary-card" as="article">
        <h2>记忆馆</h2>
        <a href="/memory" onClick={(event) => onNavigate("memory", event)}>
          <img src={aiCompanyAssets.memory} alt="记忆馆概览" />
        </a>
        <p><strong>1,234</strong><span>杭州记忆</span></p>
      </DesignCard>
      <DesignCard className="dashboard-card world-summary-card" as="article">
        <h2>财务楼</h2>
        <img src={aiCompanyAssets.finance} alt="财务楼概览" />
        <p><strong>¥2.56M</strong><span>总资产</span></p>
      </DesignCard>
    </div>
  );
}

function WorldInfoRail() {
  return (
    <>
      <DesignCard className="stats-card world-stats-card">
        <h2>城市状态</h2>
        <dl>
          <dt>城市</dt><dd>杭州</dd>
          <dt>等级</dt><dd>Lv.10</dd>
          <dt>精力</dt><dd className="positive">75%</dd>
          <dt>心情</dt><dd>82%</dd>
        </dl>
      </DesignCard>
      <DesignCard className="upgrade-card world-map-card">
        <h2>世界地图</h2>
        <img src={aiCompanyAssets.worldmap} alt="世界地图概览" />
        <button className="button-secondary" type="button">切换城市</button>
      </DesignCard>
      <DesignCard className="upgrade-card world-map-card">
        <h2>人生轨迹</h2>
        <img src={aiCompanyAssets.timeline} alt="人生轨迹概览" />
        <button className="button-secondary" type="button">查看回顾</button>
      </DesignCard>
    </>
  );
}

function IslandHomePage({ onNavigate }: { onNavigate: NavigateHandler }) {
  return (
    <AppShell
      active="世界地图"
      className="world-dashboard"
      contentClassName="main-stage world-stage"
      onNavigate={onNavigate}
      rightRail={<WorldInfoRail />}
    >
      <WorldSceneCard onNavigate={onNavigate} />
      <WorldBottomGrid onNavigate={onNavigate} />
    </AppShell>
  );
}

function SceneCard() {
  return (
    <DesignCard className="scene-card office-scene-card">
      <img className="office-scene" src={officeScene} alt="办公室像素风场景" />
      <article className="scene-info">
        <header>
          <h1>办公室</h1>
          <span>Lv.8</span>
          <button type="button" aria-label="办公室说明">i</button>
        </header>
        <p className="scene-progress">6,500 / 10,000</p>
        <div className="progress-track"><i style={{ width: "65%" }} /></div>
        <p>这是你的创造与工作的中心，AI 员工与你一起推动项目进展。</p>
      </article>
    </DesignCard>
  );
}

function BuildingStats() {
  return (
    <>
      <DesignCard className="stats-card">
        <h2>建筑属性</h2>
        <dl>
          <dt>面积</dt><dd>850 m²</dd>
          <dt>员工</dt><dd>6 / 6</dd>
          <dt>效率</dt><dd className="positive">125%</dd>
          <dt>维护费用</dt><dd>320 / 天</dd>
        </dl>
      </DesignCard>
      <DesignCard className="upgrade-card">
        <h2>升级效果</h2>
        <p>下一等级: <strong>Lv.9</strong></p>
        <ul>
          <li><img src={gameAssets.addon.icons.coin} alt="" />面积 <span>+100</span></li>
          <li><img src={gameAssets.addon.badges.energy} alt="" />效率 <span>+15%</span></li>
          <li><img src={gameAssets.addon.icons.user} alt="" />员工上限 <span>+1</span></li>
        </ul>
        <button type="button">升级</button>
        <footer>
          <span><img src={gameAssets.addon.icons.coin} alt="" />12,000</span>
          <span><img src={gameAssets.addon.badges.memory} alt="" />180</span>
        </footer>
      </DesignCard>
    </>
  );
}

function TaskPanel() {
  return (
    <section className="dashboard-card task-panel">
      <h2>今日任务</h2>
      <div className="task-list">
        {tasks.map(([time, title, done]) => (
          <article key={title}>
            <time>{time}</time>
            <span>{title}</span>
            <i className={done ? "done" : ""}>{done ? "✓" : ""}</i>
          </article>
        ))}
      </div>
      <button type="button">查看全部任务</button>
    </section>
  );
}

function EmployeePanel() {
  return (
    <section className="dashboard-card employee-panel">
      <header>
        <h2>AI 员工</h2>
        <span>6 / 6</span>
      </header>
      <div className="employee-grid">
        {employees.map(([name, role, work, avatar, status]) => (
          <article key={name}>
            <img src={avatar} alt="" />
            <div>
              <strong>{name}</strong>
              <span>{role}</span>
              <small>{work}</small>
            </div>
            <i className={status} />
          </article>
        ))}
      </div>
      <button type="button">管理 AI 员工</button>
    </section>
  );
}

function ProjectPanel() {
  return (
    <section className="dashboard-card project-panel">
      <header>
        <h2>项目进度</h2>
        <span>4 / 6</span>
      </header>
      <div>
        {projects.map(([name, progress]) => (
          <article key={name}>
            <p><span>{name}</span><strong>{progress}%</strong></p>
            <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
          </article>
        ))}
      </div>
      <button type="button">查看详情</button>
    </section>
  );
}

function MonthlyPanel() {
  const path = chartPoints
    .map((value, index) => `${index === 0 ? "M" : "L"} ${index * 30 + 6} ${108 - value}`)
    .join(" ");

  return (
    <section className="dashboard-card month-panel">
      <header>
        <h2>本月数据</h2>
        <button type="button">本月⌄</button>
      </header>
      <div className="kpi-row">
        <article><span>收入 (CNY)</span><strong>¥ 2,568,700</strong><em>+12.5%</em></article>
        <article><span>项目完成</span><strong>18</strong><em>+20%</em></article>
        <article><span>专注时长</span><strong>136h</strong><em>+15%</em></article>
      </div>
      <svg className="line-chart" viewBox="0 0 378 120" role="img" aria-label="本月收入趋势">
        <path className="chart-grid" d="M0 24H378M0 60H378M0 96H378M42 0V116M126 0V116M210 0V116M294 0V116" />
        <path className="chart-line" d={path} />
        {chartPoints.map((value, index) => (
          <circle key={`${value}-${index}`} cx={index * 30 + 6} cy={108 - value} r="3.4" />
        ))}
      </svg>
      <button type="button">查看财务楼</button>
    </section>
  );
}

function MediaMeaningWorkbench() {
  const [note, setNote] = useState("杭州刘小龙展会，拍了很多机器人");
  const [title, setTitle] = useState(robotExhibitionMeaning.title);
  const [topics, setTopics] = useState(robotExhibitionMeaning.topics.join(", "));
  const meaningSummary = useMemo(
    () => ({
      ...robotExhibitionMeaning,
      title,
      topics: topics.split(",").map((topic) => topic.trim()).filter(Boolean)
    }),
    [title, topics]
  );

  return (
    <section className="meaning-workbench" aria-label="图片导入工作台">
      <section className="workbench-hero">
        <div>
          <span>Memory Map Production Console</span>
          <h1>图片导入工作台</h1>
          <p>把图片硬坐标、地址证据、视觉线索和笔记合成为一个可解释的意义事件。</p>
        </div>
        <div className="system-strip" aria-label="系统状态">
          <strong>SQLite ready</strong>
          <strong>Mapbox configured</strong>
          <strong>Amap provider</strong>
          <strong>Godot world_state.json</strong>
        </div>
      </section>

      <section className="workbench-grid">
        <aside className="import-panel workbench-panel">
          <header>
            <span>Step 1</span>
            <h2>导入媒体</h2>
          </header>
          <label className="file-drop">
            <input type="file" accept="image/heic,image/heif,image/jpeg,image/png" />
            <strong>选择 HEIC / JPEG 图片</strong>
            <span>当前样例：IMG_9128.HEIC</span>
          </label>
          <dl className="file-facts">
            <div><dt>设备</dt><dd>{exifGps.device}</dd></div>
            <div><dt>拍摄时间</dt><dd>{exifGps.capturedAt}</dd></div>
            <div><dt>视觉线索</dt><dd>{visualHints.join(" / ")}</dd></div>
          </dl>
          <label className="note-box">
            <span>用户笔记</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <img className="design-miniature" src={productDesign} alt="Memory Map 产品设计图" />
        </aside>

        <section className="evidence-panel workbench-panel">
          <header>
            <span>Step 2</span>
            <h2>坐标与地址证据</h2>
          </header>
          <EvidenceCard title="EXIF GPS" status="confirmed · confidence 1.0">
            <p>硬事实不会被笔记覆盖。</p>
            <dl>
              <div><dt>WGS84</dt><dd>{exifGps.longitude}, {exifGps.latitude}</dd></div>
              <div><dt>海拔</dt><dd>{exifGps.altitude}</dd></div>
              <div><dt>水平误差</dt><dd>{exifGps.horizontalError}</dd></div>
              <div><dt>evidence</dt><dd>gps_exif</dd></div>
            </dl>
          </EvidenceCard>
          <EvidenceCard title="高德地址" status="address_evidence · suggested">
            <p>{amapEvidence.address}</p>
            <dl>
              <div><dt>GCJ-02</dt><dd>{amapEvidence.converted}</dd></div>
              <div><dt>道路</dt><dd>{amapEvidence.road}</dd></div>
              <div><dt>POI</dt><dd>{amapEvidence.pois.join(" / ")}</dd></div>
            </dl>
          </EvidenceCard>
          <div className="mapbox-preview" aria-label="Mapbox 预览">
            <div className="map-grid" />
            <button className="map-pin" title="Mapbox confirmed GPS point" type="button">
              <span />
              Mapbox
            </button>
            <p>Mapbox 使用 EXIF WGS84 坐标显示硬事实点位；高德地址只作为地址证据。</p>
          </div>
        </section>

        <section className="meaning-panel workbench-panel">
          <header>
            <span>Step 3</span>
            <h2>意义确认</h2>
          </header>
          <label>
            <span>事件标题</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>主题</span>
            <input value={topics} onChange={(event) => setTopics(event.target.value)} />
          </label>
          <div className="meaning-output">
            <strong>{meaningSummary.title}</strong>
            <span>{meaningSummary.activity}</span>
            <p>{meaningSummary.topics.join(" / ")}</p>
            <em>{meaningSummary.placeMeaning}</em>
          </div>
          <div className="confidence-grid">
            <article><span>坐标</span><strong>100%</strong><small>gps_exif</small></article>
            <article><span>地址</span><strong>86%</strong><small>amap</small></article>
            <article><span>图片</span><strong>72%</strong><small>image_scene</small></article>
            <article><span>笔记</span><strong>95%</strong><small>user_note</small></article>
          </div>
          <section className="review-queue">
            <h3>证据审查</h3>
            <label><input type="checkbox" defaultChecked readOnly /> EXIF GPS 已确认</label>
            <label><input type="checkbox" defaultChecked readOnly /> 高德 POI 作为候选地址</label>
            <label><input type="checkbox" /> 笔记推理地点需要用户确认</label>
          </section>
        </section>

        <section className="sync-panel workbench-panel">
          <header>
            <span>Step 4</span>
            <h2>世界同步</h2>
          </header>
          <div className="sync-flow">
            <article><strong>EventMeaning</strong><span>{meaningSummary.title}</span></article>
            <article><strong>PlaceProfile</strong><span>robotics / AI hardware 权重上升</span></article>
            <article><strong>Layer 3</strong><span>AI 研究所与机器人展厅线索</span></article>
            <article><strong>Godot world_state.json</strong><span>只导出语义世界状态</span></article>
          </div>
        </section>
      </section>
    </section>
  );
}

export function OfficeDashboardPage({ onNavigate }: { onNavigate: NavigateHandler }) {
  return (
    <AppShell
      active="办公室"
      className="office-dashboard"
      onNavigate={onNavigate}
      rightRail={<BuildingStats />}
    >
      <SceneCard />
      <div className="bottom-grid">
        <TaskPanel />
        <EmployeePanel />
        <ProjectPanel />
        <MonthlyPanel />
      </div>
    </AppShell>
  );
}

export function MemoryImportPage({ onNavigate }: { onNavigate: NavigateHandler }) {
  return (
    <AppShell
      active="记忆馆"
      className="office-dashboard memory-import-dashboard"
      contentClassName="memory-child-stage"
      onNavigate={onNavigate}
    >
      <MemoryRoomDashboard />
      <details className="memory-deep-import">
        <summary>详细导入工作台</summary>
        <MediaMeaningWorkbench />
      </details>
    </AppShell>
  );
}

export default function App() {
  const [view, setView] = useState<ViewKey>(() => {
    if (typeof window === "undefined") {
      return "world";
    }

    return getViewFromPathname(window.location.pathname);
  });

  useEffect(() => {
    const handlePopState = () => {
      setView(getViewFromPathname(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate: NavigateHandler = (nextView, event) => {
    event?.preventDefault();

    const nextPath = getPathForView(nextView);

    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      window.history.pushState({ view: nextView }, "", nextPath);
    }

    setView(nextView);
  };

  if (view === "office") {
    return <OfficeDashboardPage onNavigate={navigate} />;
  }

  if (view === "memory") {
    return <MemoryImportPage onNavigate={navigate} />;
  }

  return <IslandHomePage onNavigate={navigate} />;
}
