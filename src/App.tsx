import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, DragEvent, ReactNode } from "react";
import { AppShell, DesignCard, type NavigateHandler } from "./components/AppShell";
import { fileToProcessingFile, MemoryLibraryDashboard } from "./components/MemoryRoom";
import { gameAssets } from "./data/gameAssets";
import { hangzhouPixelIslandPack, type PixelIslandLayer } from "./data/pixelIslandPacks";
import {
  buildAgentContext,
  buildMediaAsset,
  buildMemoryItem,
  detectCity,
  findDuplicateMemoryItem,
  type MemoryItem,
  type ProcessingFile
} from "./domain/memoryRoom";
import type { HermesAnalysisJob } from "./domain/types";
import {
  createGpsWorldSyncEvidence,
  evaluateWorldSyncPipeline,
  summarizeWorldSyncEvidence,
  type WorldSyncEvidence
} from "./domain/worldSyncPipeline";
import {
  buildAmapConvertUrl,
  buildAmapRegeoUrl,
  parseAmapConvert,
  parseAmapRegeo,
  type AmapConvertedLocation,
  type AmapParsedRegeo
} from "./integrations/amapGeocoder";
import { parseExifGpsFromArrayBuffer, type ExifGpsEvidence } from "./integrations/exifGps";
import {
  type HermesImageMeaning,
  requestHermesImageMeaning,
  sendMediaAssetToHermes
} from "./integrations/hermesAgent";
import { prepareHermesInlineImageDataUrl } from "./integrations/imageInlineData";
import {
  loadStoredHermesJobs,
  loadStoredMemoryItems,
  saveStoredHermesJobs,
  saveStoredMemoryItems
} from "./integrations/localStore";
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

type WorldStageMode = "island" | "map";
type MapboxWorldMapVariant = "rail" | "stage";
type GodotWebSessionResult = {
  sessionId?: string;
  status?: string;
  worldSlug?: string;
  completedTasks?: string[];
  visitedRooms?: string[];
};

type GodotWebSessionMessage = {
  type: "memory-map:godot-session";
  session?: GodotWebSessionResult;
  returnToApp?: boolean;
};
type GameRoom = "world" | "memory";

const memoryRoomGameMap = {
  map: "/assets/generated/v2/memory-room-map.json",
  toolFlow: "/assets/generated/v2/memory-room-tool-flow.json",
} as const;

function createGodotWebSrc(room: GameRoom) {
  const params = new URLSearchParams();
  if (room === "memory") {
    params.set("room", "memory");
  }
  params.set("boot", String(Date.now()));
  return `/godot-web/index.html?${params.toString()}`;
}

const hangzhouMap = {
  city: "杭州",
  english: "Hangzhou",
  level: "Lv.10",
  coordinates: [120.1551, 30.2741] as [number, number],
  railZoom: 7.4,
  stageZoom: 10.2
};

function isGodotWebSessionMessage(value: unknown): value is GodotWebSessionMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.type === "memory-map:godot-session";
}

export function getGameRoomFromSearch(search: string): GameRoom {
  const room = new URLSearchParams(search).get("room");
  return room === "memory" ? "memory" : "world";
}

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

function MapboxHangzhouMap({ variant }: { variant: MapboxWorldMapVariant }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "needs-token" | "error">("loading");

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === "undefined") return;

    const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
    if (!token || token.includes("your_mapbox_public_token")) {
      setMapStatus("needs-token");
      return;
    }

    let disposed = false;
    setMapStatus("loading");

    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (disposed || !mapContainerRef.current) return;

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: hangzhouMap.coordinates,
          zoom: variant === "stage" ? hangzhouMap.stageZoom : hangzhouMap.railZoom,
          minZoom: 1,
          maxZoom: 15,
          attributionControl: false,
          cooperativeGestures: false
        });

        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.className = `mapbox-hangzhou-marker mapbox-hangzhou-marker--${variant}`;
        markerElement.setAttribute("aria-label", "杭州像素岛屿");
        markerElement.innerHTML = `<span>${hangzhouMap.city}</span><small>${hangzhouMap.level}</small>`;
        markerElement.addEventListener("click", () => {
          map.flyTo({
            center: hangzhouMap.coordinates,
            zoom: variant === "stage" ? hangzhouMap.stageZoom : hangzhouMap.railZoom,
            duration: 700,
            essential: true
          });
        });

        mapRef.current = map;
        markerRef.current = new mapboxgl.Marker({ element: markerElement, anchor: "bottom" })
          .setLngLat(hangzhouMap.coordinates)
          .addTo(map);

        if (variant === "stage") {
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        }
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
        map.once("load", () => {
          if (!disposed) setMapStatus("ready");
        });
        map.on("error", () => {
          if (!disposed) setMapStatus("error");
        });
      })
      .catch(() => {
        if (!disposed) setMapStatus("error");
      });

    return () => {
      disposed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [variant]);

  const statusLabel =
    mapStatus === "ready"
      ? "Mapbox 已连接"
      : mapStatus === "needs-token"
      ? "等待 VITE_MAPBOX_TOKEN"
      : mapStatus === "error"
      ? "Mapbox 加载失败"
      : "正在连接 Mapbox";

  return (
    <div className={`mapbox-hangzhou-map mapbox-hangzhou-map--${variant}`} aria-label="Mapbox 杭州地图">
      <div
        ref={mapContainerRef}
        className="mapbox-hangzhou-canvas"
        data-mapbox-world-map
        data-mapbox-variant={variant}
        role="application"
        aria-label="Mapbox 杭州地图"
      />
      <div className={`mapbox-hangzhou-fallback${mapStatus === "ready" ? " is-hidden" : ""}`} aria-hidden={mapStatus === "ready"}>
        <span>Mapbox 杭州地图</span>
        <strong>默认杭州</strong>
        <small>{statusLabel}</small>
      </div>
    </div>
  );
}

function getPixelIslandLayerStyle(layer: PixelIslandLayer): CSSProperties {
  return {
    left: layer.position.left,
    top: layer.position.top,
    width: layer.position.width,
    height: layer.position.height,
    zIndex: layer.position.zIndex,
    transform: layer.position.rotate ? `rotate(${layer.position.rotate})` : undefined
  };
}

function getPixelIslandLabelStyle(layer: PixelIslandLayer): CSSProperties {
  return {
    left: layer.labelPosition?.left ?? layer.position.left,
    top: layer.labelPosition?.top ?? layer.position.top,
    zIndex: layer.labelPosition?.zIndex ?? layer.position.zIndex
  };
}

function PixelIslandLayerView({
  layer,
  onNavigate,
  visualMode
}: {
  layer: PixelIslandLayer;
  onNavigate: NavigateHandler;
  visualMode: "layered" | "composite";
}) {
  const style = visualMode === "composite" && layer.kind === "spot"
    ? getPixelIslandLabelStyle(layer)
    : getPixelIslandLayerStyle(layer);

  if (layer.kind !== "spot") {
    if (visualMode === "composite") return null;

    return (
      <img
        className={`ai-world-layer ai-world-layer--${layer.kind}`}
        src={layer.sprite}
        alt=""
        aria-hidden="true"
        style={style}
      />
    );
  }

  const content = (
    <>
      {visualMode === "layered" ? <img className="ai-spot-sprite" src={layer.sprite} alt="" /> : null}
      <span className="ai-spot-label">
        {layer.icon ? <img src={layer.icon} alt="" /> : null}
        <strong>{layer.label}</strong>
        <em>{layer.level}</em>
      </span>
    </>
  );

  if (layer.view) {
    return (
      <a
        className={`ai-world-spot ai-world-layer${visualMode === "composite" ? " ai-world-label-anchor" : ""}`}
        href={getPathForView(layer.view)}
        onClick={(event) => onNavigate(layer.view!, event)}
        aria-label={layer.ariaLabel ?? layer.label}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`ai-world-spot ai-world-layer${visualMode === "composite" ? " ai-world-label-anchor" : ""}`} style={style}>
      {content}
    </div>
  );
}

function PixelStageHud() {
  return (
    <>
      <div className="pixel-stage-hud" aria-label="杭州舞台状态栏">
        <div className="pixel-stage-pill pixel-stage-location">
          <img src={gameAssets.icons.mapPin} alt="" />
          <strong>杭州</strong>
          <span>Hangzhou</span>
          <b>⌄</b>
        </div>
        <div className="pixel-stage-pill pixel-stage-weather">
          <img src={gameAssets.addon.icons.energy} alt="" />
          <strong>24°C</strong>
          <span>晴 · 空气优 28</span>
        </div>
      </div>
      <div className="pixel-stage-tools" aria-label="快捷状态">
        <button type="button" aria-label="日历"><img src={gameAssets.addon.icons.calendar} alt="" /></button>
        <button type="button" aria-label="消息"><img src={gameAssets.addon.icons.bell} alt="" /><i>3</i></button>
        <button type="button" aria-label="设置"><img src={gameAssets.addon.icons.settings} alt="" /></button>
        <button type="button" aria-label="玩家"><img src={gameAssets.player} alt="" /></button>
      </div>
    </>
  );
}

function PixelStageStatusCard() {
  const rows = [
    ["时间", "68%", "8.2h / 12h", "time"],
    ["精力", "75%", "良好", "energy"],
    ["心情", "82%", "愉悦", "mood"],
  ] as const;

  return (
    <aside className="pixel-stage-status-card" aria-label="今日状态">
      <h2>今日状态</h2>
      {rows.map(([label, value, note, key]) => (
        <p key={key} className={`pixel-status-row pixel-status-row--${key}`}>
          <span>{label}</span>
          <strong>{value}</strong>
          <i><em style={{ width: value }} /></i>
          <small>{note}</small>
        </p>
      ))}
    </aside>
  );
}

function WorldSceneCard({
  onNavigate,
  onShowMap
}: {
  onNavigate: NavigateHandler;
  onShowMap: () => void;
}) {
  const pack = hangzhouPixelIslandPack;
  const visualMode: "composite" = "composite";

  return (
    <DesignCard className="scene-card world-scene-card">
      <div
        className="ai-world-scene ai-world-scene--generated"
        data-pixel-island-pack={pack.slug}
        data-scene-image={pack.sceneImage}
        data-background-source={pack.background}
        data-sprites-manifest={pack.spritesManifest}
        role="img"
        aria-label={pack.title}
        style={{ backgroundImage: `url(${pack.sceneImage})` }}
      >
        <PixelStageHud />
        {pack.layers.map((layer) => (
          <PixelIslandLayerView key={layer.key} layer={layer} onNavigate={onNavigate} visualMode={visualMode} />
        ))}
        <PixelStageStatusCard />
      </div>
      <article className="world-scene-meta visually-hidden">
        <h1>我的世界</h1>
        <p>{pack.level}</p>
        <p>Day 10,532</p>
        <p>{pack.city} 的像素岛屿由背景、切图素材和摆放数据拼接而成。</p>
      </article>
      <div className="world-stage-actions world-stage-actions--map-only">
        <a
          className="world-map-chip world-game-chip"
          href={getPathForView("game")}
          onClick={(event) => onNavigate("game", event)}
          data-godot-session-entry={pack.slug}
        >
          <img src={gameAssets.player} alt="" />
          <span>进入杭州像素岛</span>
          <b>›</b>
        </a>
        <button className="world-map-chip" type="button" onClick={onShowMap}>
          <img src={gameAssets.icons.mapPin} alt="" />
          <span>世界地图</span>
          <b>›</b>
        </button>
      </div>
    </DesignCard>
  );
}

function WorldMapStageCard({ onShowIsland }: { onShowIsland: () => void }) {
  return (
    <DesignCard className="scene-card world-scene-card world-map-stage-card">
      <MapboxHangzhouMap variant="stage" />
      <article className="scene-info world-scene-info world-map-stage-info">
        <header>
          <h1>世界地图</h1>
          <span>默认杭州</span>
        </header>
        <p className="scene-progress">{hangzhouMap.city} · {hangzhouMap.english}</p>
        <div className="progress-track"><i style={{ width: "68%" }} /></div>
        <p>真实 Mapbox 地图默认缩放到杭州；需要回到游戏感空间时，切回杭州像素岛屿。</p>
      </article>
      <button className="button-primary world-island-entry" type="button" onClick={onShowIsland}>杭州像素岛屿</button>
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

function WorldInfoRail({
  onShowIsland,
  onShowMap
}: {
  onShowIsland: () => void;
  onShowMap: () => void;
}) {
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
      <DesignCard className="upgrade-card world-map-card world-mapbox-card">
        <header className="world-mapbox-card-header">
          <h2>世界地图</h2>
          <span>默认杭州</span>
        </header>
        <MapboxHangzhouMap variant="rail" />
        <button className="button-secondary" type="button" onClick={onShowMap}>切换到世界地图</button>
        <button className="world-mapbox-text-button" type="button" onClick={onShowIsland}>杭州像素岛屿</button>
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
  const [stageMode, setStageMode] = useState<WorldStageMode>("island");
  const showIsland = () => setStageMode("island");
  const showMap = () => setStageMode("map");

  return (
    <AppShell
      active="世界地图"
      className="world-dashboard"
      contentClassName="main-stage world-stage"
      onNavigate={onNavigate}
      rightRail={<WorldInfoRail onShowIsland={showIsland} onShowMap={showMap} />}
      showTopBar={false}
    >
      {stageMode === "map" ? (
        <WorldMapStageCard onShowIsland={showIsland} />
      ) : (
        <WorldSceneCard onNavigate={onNavigate} onShowMap={showMap} />
      )}
      <WorldBottomGrid onNavigate={onNavigate} />
    </AppShell>
  );
}

function focusGodotFrame(frame: HTMLIFrameElement | null) {
  if (!frame) {
    return;
  }

  frame.focus();
  frame.contentWindow?.focus();
  const canvas = frame.contentDocument?.getElementById("canvas");
  if (canvas instanceof HTMLCanvasElement) {
    canvas.focus();
  }
}

function MemoryGameMapPage({ onNavigate }: { onNavigate: NavigateHandler }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const godotWebSrc = useMemo(() => createGodotWebSrc("memory"), []);
  const focusMemoryFrame = () => focusGodotFrame(frameRef.current);

  return (
    <AppShell
      active="记忆馆"
      className="godot-game-shell memory-game-shell"
      contentClassName="godot-game-stage memory-game-stage"
      onNavigate={onNavigate}
      showTopBar={false}
    >
      <section
        className="godot-game-card memory-game-card"
        aria-label="记忆室 Godot 游戏"
        data-memory-game-map={memoryRoomGameMap.map}
        data-memory-tool-flow={memoryRoomGameMap.toolFlow}
      >
        <header className="godot-game-toolbar memory-game-toolbar">
          <div className="godot-game-pill godot-game-city">
            <img src={gameAssets.icons.memory} alt="" />
            <strong>记忆室</strong>
            <span>Memory Room</span>
          </div>
          <div className="godot-game-pill godot-game-weather">
            <img src={gameAssets.addon.icons.camera} alt="" />
            <strong>Godot 可玩模式</strong>
            <span>WASD · 点击物件</span>
          </div>
          <p className="godot-game-session-pill">Session 运行中 · 记忆室</p>
        </header>
        <iframe
          ref={frameRef}
          className="godot-web-frame"
          src={godotWebSrc}
          title="记忆室 Godot 游戏"
          allow="autoplay; fullscreen; gamepad; clipboard-read; clipboard-write"
          tabIndex={0}
          onLoad={focusMemoryFrame}
          onPointerDown={focusMemoryFrame}
        />
      </section>
    </AppShell>
  );
}

function GodotWorldGamePage({ onNavigate }: { onNavigate: NavigateHandler }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [sessionResult, setSessionResult] = useState<GodotWebSessionResult | null>(null);
  const godotWebSrc = useMemo(() => createGodotWebSrc("world"), []);
  const visitedRooms = sessionResult?.visitedRooms?.length ?? 0;
  const completedTasks = sessionResult?.completedTasks?.length ?? 0;
  const focusWorldFrame = () => focusGodotFrame(frameRef.current);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isGodotWebSessionMessage(event.data)) {
        return;
      }

      const godotWindow = frameRef.current?.contentWindow;
      if (godotWindow && event.source !== godotWindow) {
        return;
      }

      if (event.data.session) {
        setSessionResult(event.data.session);
        window.sessionStorage.setItem("memory-map:last-godot-session", JSON.stringify(event.data.session));
      }

      if (event.data.returnToApp) {
        onNavigate("world");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onNavigate]);

  return (
    <AppShell
      active="世界地图"
      className="godot-game-shell"
      contentClassName="godot-game-stage"
      onNavigate={onNavigate}
      showTopBar={false}
    >
      <section className="godot-game-card" aria-label="杭州像素岛">
        <header className="godot-game-toolbar">
          <div className="godot-game-pill godot-game-city">
            <img src={gameAssets.icons.mapPin} alt="" />
            <strong>杭州</strong>
            <span>Hangzhou</span>
          </div>
          <div className="godot-game-pill godot-game-weather">
            <img src={gameAssets.addon.icons.energy} alt="" />
            <strong>24°C</strong>
            <span>晴 · 空气优 28</span>
          </div>
          <p className="godot-game-session-pill">
            {sessionResult ? `Session 已同步 · ${visitedRooms} 房间 · ${completedTasks} 任务` : "Session 运行中"}
          </p>
        </header>
        <iframe
          ref={frameRef}
          className="godot-web-frame"
          src={godotWebSrc}
          title="杭州像素岛 Godot 游戏"
          allow="autoplay; fullscreen; gamepad; clipboard-read; clipboard-write"
          tabIndex={0}
          onLoad={focusWorldFrame}
          onPointerDown={focusWorldFrame}
        />
      </section>
    </AppShell>
  );
}

export function GodotWebGamePage({ onNavigate, room = "world" }: { onNavigate: NavigateHandler; room?: GameRoom }) {
  return room === "memory" ? (
    <MemoryGameMapPage onNavigate={onNavigate} />
  ) : (
    <GodotWorldGamePage onNavigate={onNavigate} />
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

type SelectedImageFact = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  dataUrl?: string;
  previewUrl?: string;
};

export function createArchiveProcessingFile(image: SelectedImageFact): ProcessingFile {
  return {
    name: image.name,
    size: image.size,
    type: "image",
    lastModified: image.lastModified,
    previewUrl: image.dataUrl ?? image.previewUrl
  };
}

export type ExifReadStatus = "empty" | "reading" | "found" | "missing" | "unsupported" | "failed";

type ImportProgressStepState = "done" | "active" | "warning" | "pending";

export type ImageImportProgressStep = {
  label: string;
  detail: string;
  state: ImportProgressStepState;
};

export function buildImageImportProgressSteps(input: {
  hasImage: boolean;
  hasGpsEvidence: boolean;
  exifStatus: ExifReadStatus;
  meaningGenerated: boolean;
}): ImageImportProgressStep[] {
  return [
    {
      label: "选择图片",
      detail: input.hasImage ? "图片已载入本地工作台" : "等待单张 HEIC / JPEG 图片",
      state: input.hasImage ? "done" : "active"
    },
    {
      label: "读取证据",
      detail: input.hasGpsEvidence
        ? "EXIF GPS 已确认"
        : input.exifStatus === "reading"
        ? "正在读取 EXIF"
        : input.hasImage
        ? "未得到可用 GPS，等待补充证据"
        : "等待图片后读取 EXIF",
      state: input.hasGpsEvidence ? "done" : input.exifStatus === "reading" ? "active" : input.hasImage ? "warning" : "pending"
    },
    {
      label: "生成信息",
      detail: input.meaningGenerated
        ? "已生成事件草稿"
        : input.hasImage && !input.hasGpsEvidence
        ? "等待补充证据后生成"
        : input.hasImage
        ? "根据文件名和证据生成"
        : "等待图片信息",
      state: input.meaningGenerated ? "done" : input.hasImage && input.hasGpsEvidence ? "active" : "pending"
    },
    {
      label: "同步世界",
      detail: input.meaningGenerated ? "等待地点画像达到 10 张阈值" : "等待 EventMeaning 生成后进入聚合",
      state: "pending"
    }
  ];
}

type AddressLookupState =
  | { status: "blocked" }
  | { status: "not_configured" }
  | { status: "loading" }
  | { status: "ready"; converted: AmapConvertedLocation; regeo: AmapParsedRegeo }
  | { status: "failed"; error: string };

type ImageMeaningLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; meaning: HermesImageMeaning }
  | { status: "offline" }
  | { status: "failed"; error: string };

function createImportWorldSyncEvidence(input: {
  image: SelectedImageFact;
  gps: ExifGpsEvidence;
  address: AddressLookupState;
  hermesSucceeded: boolean;
}): WorldSyncEvidence {
  const gpsEvidence = createGpsWorldSyncEvidence({
    longitude: input.gps.longitude,
    latitude: input.gps.latitude,
    capturedAt: new Date(input.image.lastModified).toISOString(),
    hermesSucceeded: input.hermesSucceeded
  });

  if (input.address.status === "ready") {
    const placeName =
      input.address.regeo.pois[0]?.name ||
      input.address.regeo.formattedAddress;
    return {
      ...gpsEvidence,
      placeName
    };
  }

  return gpsEvidence;
}

function fileStem(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function inferImageTopics(name: string) {
  const stem = fileStem(name).toLowerCase();
  const topics = ["memory", "photo"];
  if (/travel|trip|city|hangzhou|shenzhen|shanghai|beijing|tokyo|杭州|深圳|上海|北京|东京/.test(stem)) {
    topics.push("place");
  }
  if (/work|office|meeting|expo|展会|会议|办公室/.test(stem)) {
    topics.push("work");
  }
  return Array.from(new Set(topics));
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatLocalDateTime(ms: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(ms));
}

function isSupportedImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png)$/i.test(file.name);
}

async function lookupAmapAddress(gps: ExifGpsEvidence): Promise<AddressLookupState> {
  const key = import.meta.env.VITE_AMAP_KEY as string | undefined;
  if (!key) return { status: "not_configured" };

  const convertedResponse = await fetch(buildAmapConvertUrl({
    key,
    longitude: gps.longitude,
    latitude: gps.latitude
  }));
  const converted = parseAmapConvert(await convertedResponse.json());
  const regeoResponse = await fetch(buildAmapRegeoUrl({
    key,
    amapLocation: converted.rawLocation
  }));
  const regeo = parseAmapRegeo(await regeoResponse.json());
  return { status: "ready", converted, regeo };
}

type HermesJobView = HermesAnalysisJob & {
  gatewayStatus: "offline" | "sent" | "failed";
  payloadPreview: string;
};

type ArchiveState =
  | { status: "idle" }
  | { status: "archiving" }
  | { status: "duplicate"; item: MemoryItem }
  | { status: "archived"; item: MemoryItem; job: HermesJobView }
  | { status: "failed"; error: string };

type BatchImportStatus = "queued" | "processing" | "done" | "failed";

type BatchImportItem = {
  id: string;
  name: string;
  size: number;
  status: BatchImportStatus;
  detail: string;
  previewUrl?: string;
  error?: string;
};

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

function MediaMeaningWorkbench() {
  const [image, setImage] = useState<SelectedImageFact>();
  const [gpsEvidence, setGpsEvidence] = useState<ExifGpsEvidence>();
  const [exifStatus, setExifStatus] = useState<ExifReadStatus>("empty");
  const [addressState, setAddressState] = useState<AddressLookupState>({ status: "blocked" });
  const [imageMeaningState, setImageMeaningState] = useState<ImageMeaningLookupState>({ status: "idle" });
  const [archiveState, setArchiveState] = useState<ArchiveState>({ status: "idle" });
  const [storedMemoryItems, setStoredMemoryItems] = useState<MemoryItem[]>(() => loadStoredMemoryItems([]));
  const [batchItems, setBatchItems] = useState<BatchImportItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importError, setImportError] = useState("");
  const archiveTokenRef = useRef(0);
  const imageMeaningTokenRef = useRef(0);

  const archived = archiveState.status === "archived" || archiveState.status === "duplicate";
  const duplicateArchive = archiveState.status === "duplicate";
  const archiving = archiveState.status === "archiving";
  const archiveFailed = archiveState.status === "failed";
  const archivedItem = archived ? archiveState.item : undefined;
  const archivedJob = archiveState.status === "archived" ? archiveState.job : undefined;
  const hermesMeaning = imageMeaningState.status === "ready" ? imageMeaningState.meaning : undefined;

  const inferredTopics = useMemo(() => (image ? inferImageTopics(image.name) : []), [image]);
  const meaningSummary = useMemo(
    () => {
      if (!image) return undefined;
      return {
        title: archivedItem?.title ?? hermesMeaning?.sceneSummary ?? fileStem(image.name) ?? "未命名图片记忆",
        activity: "image_memory_import",
        topics: archivedItem?.topics ?? hermesMeaning?.topics ?? (inferredTopics.length > 0 ? inferredTopics : ["memory", "photo"]),
        placeMeaning: hermesMeaning?.memoryMeaning ?? (
          archivedItem?.city
            ? `archived_at_${archivedItem.city}`
            : gpsEvidence
            ? "confirmed_location_memory"
            : addressState.status === "ready"
            ? "address_suggested_memory"
            : "awaiting_location_evidence"
        )
      };
    },
    [addressState.status, archivedItem, gpsEvidence, hermesMeaning, image, inferredTopics]
  );
  const fileConfidence = image ? 100 : 0;
  const hasUsableLocationEvidence = Boolean(gpsEvidence);
  const meaningGenerated = Boolean(image && meaningSummary && hasUsableLocationEvidence);
  const visibleMeaningSummary = meaningGenerated ? meaningSummary : undefined;
  const currentWorldSyncEvidence = useMemo(() => {
    if (!image || !gpsEvidence || !meaningGenerated) return undefined;
    return createImportWorldSyncEvidence({
      image,
      gps: gpsEvidence,
      address: addressState,
      hermesSucceeded: imageMeaningState.status === "ready"
    });
  }, [addressState, gpsEvidence, image, imageMeaningState.status, meaningGenerated]);
  const worldSyncStatus = useMemo(() => {
    const targetEvidence = archivedItem?.syncEvidence ?? currentWorldSyncEvidence;
    return evaluateWorldSyncPipeline(
      targetEvidence
        ? summarizeWorldSyncEvidence({
            stored: storedMemoryItems.flatMap((item) => item.syncEvidence ? [item.syncEvidence] : []),
            current: targetEvidence
          })
        : summarizeWorldSyncEvidence({ stored: [] })
    );
  }, [archivedItem?.syncEvidence, currentWorldSyncEvidence, storedMemoryItems]);

  const handleArchiveMemory = async () => {
    if (!image || !meaningSummary || archiving || archived) return;

    const token = archiveTokenRef.current + 1;
    archiveTokenRef.current = token;
    setArchiveState({ status: "archiving" });

    try {
      const storedItems = loadStoredMemoryItems([]);
      const processingFile = createArchiveProcessingFile(image);
      const duplicateItem = findDuplicateMemoryItem(storedItems, processingFile);
      if (duplicateItem) {
        if (archiveTokenRef.current === token) {
          setArchiveState({ status: "duplicate", item: duplicateItem });
        }
        return;
      }
      const built = buildMemoryItem(processingFile, { sequence: storedItems.length });

      let resolvedCity = built.city;
      if (addressState.status === "ready") {
        const rawCity = addressState.regeo.address.city?.replace(/(市|省)$/u, "").trim();
        if (rawCity) {
          resolvedCity = detectCity(rawCity) ?? rawCity;
        }
      }
      const syncEvidence = currentWorldSyncEvidence;
      const item: MemoryItem = hermesMeaning
        ? {
            ...built,
            city: resolvedCity,
            title: hermesMeaning.sceneSummary?.trim() || built.title,
            summary: hermesMeaning.memoryMeaning?.trim() || built.summary,
            topics: hermesMeaning.topics?.length ? hermesMeaning.topics : built.topics,
            syncEvidence
          }
        : { ...built, city: resolvedCity, syncEvidence };

      const importedAt = new Date().toISOString();
      const asset = buildMediaAsset(processingFile, item, importedAt);
      const context = buildAgentContext(item, importedAt);
      const result = await sendMediaAssetToHermes(asset, context);
      const jobView: HermesJobView = {
        ...result.job,
        gatewayStatus: result.status,
        payloadPreview: JSON.stringify({
          assetId: asset.id,
          type: asset.type,
          source: asset.source,
          contentPreview: item.summary,
          messageCount: result.payload.messages.length,
          privacy: result.payload.metadata.privacy
        })
      };

      const nextStoredItems = [item, ...storedItems];
      saveStoredMemoryItems(nextStoredItems);
      saveStoredHermesJobs([jobView, ...loadStoredHermesJobs([])]);
      if (archiveTokenRef.current === token) {
        setStoredMemoryItems(nextStoredItems);
        setArchiveState({ status: "archived", item, job: jobView });
      }
    } catch (error) {
      if (archiveTokenRef.current === token) {
        setArchiveState({
          status: "failed",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };

  const requestImageMeaning = async (
    imageFact: SelectedImageFact,
    gps: ExifGpsEvidence,
    address: AddressLookupState,
    token: number
  ) => {
    if (!imageFact.dataUrl) {
      setImageMeaningState({ status: "failed", error: "图片无法转换为 Hermes inline image" });
      return;
    }

    setImageMeaningState({ status: "loading" });
    try {
      const result = await requestHermesImageMeaning({
        fileName: imageFact.name,
        imageDataUrl: imageFact.dataUrl,
        capturedAt: formatLocalDateTime(imageFact.lastModified),
        gps: {
          longitude: gps.longitude,
          latitude: gps.latitude,
          altitude: gps.altitude,
          horizontalError: gps.horizontalError
        },
        address: address.status === "ready"
          ? {
              formattedAddress: address.regeo.formattedAddress,
              roads: address.regeo.roads.map((road) => road.name).slice(0, 4),
              pois: address.regeo.pois.map((poi) => poi.name).slice(0, 6)
            }
          : undefined
      });
      if (imageMeaningTokenRef.current !== token) return;
      setImageMeaningState(result.status === "sent" ? { status: "ready", meaning: result.meaning } : { status: "offline" });
    } catch (error) {
      if (imageMeaningTokenRef.current !== token) return;
      setImageMeaningState({
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  useEffect(() => {
    if (!meaningGenerated || archiveState.status !== "idle") return;
    if (imageMeaningState.status === "loading" || imageMeaningState.status === "idle") return;
    void handleArchiveMemory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveState.status, meaningGenerated, imageMeaningState.status]);

  useEffect(() => {
    return () => {
      if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    };
  }, [image]);

  const importImageFile = async (file: File) => {
    if (!isSupportedImageFile(file)) {
      setImportError("请拖入 HEIC / JPEG / PNG 图片文件。");
      return;
    }

    setImportError("");
    setStoredMemoryItems(loadStoredMemoryItems([]));
    setArchiveState({ status: "idle" });
    setGpsEvidence(undefined);
    setExifStatus("reading");
    setAddressState({ status: "blocked" });
    setImageMeaningState({ status: "idle" });
    const imageMeaningToken = imageMeaningTokenRef.current + 1;
    imageMeaningTokenRef.current = imageMeaningToken;
    let selectedImage: SelectedImageFact = {
      name: file.name,
      type: file.type || "unknown",
      size: file.size,
      lastModified: file.lastModified,
      dataUrl: undefined,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
    };
    const duplicateItem = findDuplicateMemoryItem(loadStoredMemoryItems([]), {
      name: selectedImage.name,
      size: selectedImage.size,
      type: "image"
    });
    setImage((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return selectedImage;
    });
    if (duplicateItem) {
      setArchiveState({ status: "duplicate", item: duplicateItem });
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dataUrl = duplicateItem ? undefined : await prepareHermesInlineImageDataUrl(file).catch(() => undefined);
      selectedImage = { ...selectedImage, dataUrl };
      setImage(selectedImage);
      const gps = parseExifGpsFromArrayBuffer(arrayBuffer);
      if (!gps) {
        setExifStatus("missing");
        setAddressState({ status: "blocked" });
        return;
      }

      setGpsEvidence(gps);
      setExifStatus("found");
      setAddressState({ status: "loading" });
      lookupAmapAddress(gps)
        .then((nextAddressState) => {
          setAddressState(nextAddressState);
          if (!duplicateItem) void requestImageMeaning(selectedImage, gps, nextAddressState, imageMeaningToken);
        })
        .catch((error) => {
          const failedAddressState: AddressLookupState = {
            status: "failed",
            error: error instanceof Error ? error.message : String(error)
          };
          setAddressState(failedAddressState);
          if (!duplicateItem) void requestImageMeaning(selectedImage, gps, failedAddressState, imageMeaningToken);
        });
    } catch {
      setExifStatus("failed");
      setAddressState({ status: "blocked" });
      setImageMeaningState({ status: "idle" });
    }
  };

  const updateBatchItem = (id: string, patch: Partial<BatchImportItem>) => {
    setBatchItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const showBatchFileInWorkbench = async (file: File, processingFile?: ProcessingFile) => {
    const previewUrl =
      processingFile?.previewUrl ??
      (file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined);
    const selectedImage: SelectedImageFact = {
      name: file.name,
      type: file.type || "unknown",
      size: file.size,
      lastModified: file.lastModified,
      dataUrl: undefined,
      previewUrl
    };

    setImage((current) => {
      if (current?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(current.previewUrl);
      return selectedImage;
    });
    setArchiveState({ status: "idle" });
    setImageMeaningState({ status: "idle" });
    setGpsEvidence(undefined);
    setExifStatus("reading");
    setAddressState({ status: "blocked" });

    if (!processingFile?.syncEvidence) {
      setExifStatus("missing");
      return;
    }

    const gps = parseExifGpsFromArrayBuffer(await file.arrayBuffer());
    if (!gps) {
      setExifStatus("missing");
      return;
    }

    setGpsEvidence(gps);
    setExifStatus("found");
    setAddressState({ status: "loading" });
    try {
      const nextAddressState = await lookupAmapAddress(gps);
      setAddressState(nextAddressState);
    } catch (error) {
      setAddressState({
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const importBatchImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const queue = files.map((file, index) => ({
      id: `batch-${file.name}-${file.lastModified}-${file.size}-${index}`,
      name: file.name,
      size: file.size,
      status: "queued" as const,
      detail: "等待处理"
    }));
    setBatchItems(queue);
    setBatchProcessing(true);
    setImportError("");
    setArchiveState({ status: "idle" });
    setImageMeaningState({ status: "idle" });
    setGpsEvidence(undefined);
    setExifStatus("empty");
    setAddressState({ status: "blocked" });
    await yieldToBrowser();

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const queued = queue[index];
        updateBatchItem(queued.id, { status: "processing", detail: `正在处理第 ${index + 1} / ${files.length} 张：读取预览和 EXIF GPS` });
        await yieldToBrowser();

        if (!isSupportedImageFile(file)) {
          updateBatchItem(queued.id, {
            status: "failed",
            detail: "文件类型不支持",
            error: "只支持 HEIC / JPEG / PNG 图片"
          });
          continue;
        }

        try {
          const processingFile = await fileToProcessingFile(file);
          await showBatchFileInWorkbench(file, processingFile);
          updateBatchItem(queued.id, {
            previewUrl: processingFile.previewUrl,
            detail: processingFile.syncEvidence ? "EXIF GPS 已确认，正在写入记忆库" : "未读取到 GPS，仍保留预览并等待补充证据"
          });
          await yieldToBrowser();

          const storedItems = loadStoredMemoryItems([]);
          const duplicateItem = findDuplicateMemoryItem(storedItems, processingFile);
          if (duplicateItem) {
            setArchiveState({ status: "duplicate", item: duplicateItem });
            updateBatchItem(queued.id, {
              status: "done",
              detail: "已存在，跳过重复写入"
            });
            continue;
          }

          const item = buildMemoryItem(processingFile, { sequence: storedItems.length });
          const nextStoredItems = [item, ...storedItems];
          const importedAt = new Date().toISOString();
          saveStoredMemoryItems(nextStoredItems);
          setStoredMemoryItems(nextStoredItems);
          setArchiveState({
            status: "archived",
            item,
            job: {
              id: `local-${item.id}`,
              mediaAssetId: item.id,
              jobType: "media-analysis",
              inputSummary: item.summary,
              status: "pending",
              createdAt: importedAt,
              gatewayStatus: "offline",
              payloadPreview: JSON.stringify({
                assetId: item.id,
                type: item.type,
                source: "file_import",
                contentPreview: item.summary,
                messageCount: 0,
                privacy: "local-batch-import"
              })
            }
          });

          const asset = buildMediaAsset(processingFile, item, importedAt);
          const context = buildAgentContext(item, importedAt);
          try {
            const result = await sendMediaAssetToHermes(asset, context);
            const jobView: HermesJobView = {
              ...result.job,
              gatewayStatus: result.status,
              payloadPreview: JSON.stringify({
                assetId: asset.id,
                type: asset.type,
                source: asset.source,
                contentPreview: item.summary,
                messageCount: result.payload.messages.length,
                privacy: result.payload.metadata.privacy
              })
            };
            saveStoredHermesJobs([jobView, ...loadStoredHermesJobs([])]);
            setArchiveState({ status: "archived", item, job: jobView });
            updateBatchItem(queued.id, {
              status: "done",
              detail: item.syncEvidence ? "已写入记忆库 · 参与 10 张地点匹配" : "已写入记忆库 · 等待补充地点证据"
            });
          } catch (error) {
            updateBatchItem(queued.id, {
              status: "done",
              detail: "已写入记忆库 · Hermes payload 稍后重试",
              error: error instanceof Error ? error.message : String(error)
            });
          }
        } catch (error) {
          updateBatchItem(queued.id, {
            status: "failed",
            detail: "处理失败",
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    if (files.length > 1) {
      void importBatchImageFiles(files);
    } else {
      void importImageFile(files[0]);
    }
    event.target.value = "";
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      const pastedImage = files.find(isSupportedImageFile);
      if (!pastedImage) return;

      event.preventDefault();
      void importImageFile(pastedImage);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handlePageDragEnter = (event: DragEvent<HTMLElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      setDragOver(true);
    }
  };

  const handlePageDragOver = (event: DragEvent<HTMLElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  };

  const handlePageDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragOver(false);
    }
  };

  const handlePageDrop = (event: DragEvent<HTMLElement>) => {
    if (event.dataTransfer.files.length === 0) return;
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 1) {
      void importBatchImageFiles(files);
    } else {
      void importImageFile(files[0]);
    }
  };

  const exifStatusLabel =
    exifStatus === "reading"
      ? "reading · local exif"
      : exifStatus === "found"
      ? "confirmed · confidence 1.0"
      : exifStatus === "missing"
      ? "missing · no gps"
      : exifStatus === "unsupported"
      ? "unsupported · heic parser pending"
      : exifStatus === "failed"
      ? "failed · exif read error"
      : "missing · no file";

  const addressStatusLabel =
    addressState.status === "ready"
      ? "address_evidence · suggested"
      : addressState.status === "loading"
      ? "loading · amap"
      : addressState.status === "not_configured"
      ? "not configured · VITE_AMAP_KEY"
      : addressState.status === "failed"
      ? "failed · amap"
      : "blocked · needs confirmed coordinates";
  const imageMeaningStatusLabel =
    imageMeaningState.status === "ready"
      ? `hermes vision · confidence ${imageMeaningState.meaning.confidence.toFixed(2)}`
      : imageMeaningState.status === "loading"
      ? "loading · hermes vision"
      : imageMeaningState.status === "failed"
      ? "failed · hermes vision"
      : imageMeaningState.status === "offline"
      ? "offline · local fallback"
      : "waiting · hermes vision";
  const importProgressSteps = buildImageImportProgressSteps({
    hasImage: Boolean(image),
    hasGpsEvidence: hasUsableLocationEvidence,
    exifStatus,
    meaningGenerated
  }).map((step) =>
    step.label === "同步世界"
      ? {
          ...step,
          detail: duplicateArchive
            ? "已存在，继续等待地点画像阈值"
            : archived
            ? worldSyncStatus.placeProfile
            : archiving
            ? "正在生成记忆事件"
            : step.detail,
          state: worldSyncStatus.readyForPlaceProfile ? "active" as const : step.state
        }
      : step
  );
  const batchDoneCount = batchItems.filter((item) => item.status === "done").length;
  const batchFailedCount = batchItems.filter((item) => item.status === "failed").length;
  const batchCompletedCount = batchDoneCount + batchFailedCount;
  const batchProgressPercent = batchItems.length ? Math.round((batchCompletedCount / batchItems.length) * 100) : 0;
  const batchActiveItem = batchItems.find((item) => item.status === "processing");
  const batchProgressLabel = batchItems.length
    ? `${batchCompletedCount} / ${batchItems.length}`
    : "等待批量选择图片";
  return (
    <section
      className={`meaning-workbench${dragOver ? " is-dragging-image" : ""}`}
      aria-label="图片导入工作台"
      data-drop-state={dragOver ? "dragging" : "idle"}
      onDragEnter={handlePageDragEnter}
      onDragLeave={handlePageDragLeave}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
      <section className="workbench-hero">
        <div>
          <span>自动导入模式</span>
          <h1>图片导入工作台</h1>
          <p>把图片硬坐标、地址证据和视觉线索自动合成为一个可解释的意义事件，不需要再填写内容或点击确认。</p>
        </div>
        <div className="system-strip" aria-label="系统状态">
          <strong>SQLite ready</strong>
          <strong>Mapbox configured</strong>
          <strong>Amap provider</strong>
          <strong>Godot world_state.json</strong>
        </div>
      </section>

      <section className="image-import-progress" aria-label="导入进度">
        <div className="image-import-progress-header">
          <strong>导入进度</strong>
          <span>
            {archived
              ? "已生成 EventMeaning，等待证据聚合"
              : archiving
              ? "正在生成记忆事件"
              : meaningGenerated
              ? "信息已生成，等待地点画像阈值"
              : image && !hasUsableLocationEvidence && exifStatus !== "reading"
              ? "读取证据未完成，等待补充证据"
              : image
              ? "图片已进入处理流"
              : "从单张图片开始"}
          </span>
        </div>
        <ol>
          {importProgressSteps.map((step, index) => (
            <li data-state={step.state} key={step.label}>
              <span className="progress-index">{index + 1}</span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="workbench-grid">
        <aside className="import-panel workbench-panel">
          <header>
            <span>Step 1</span>
            <h2>导入图片</h2>
          </header>
          <label className="file-drop">
            <input type="file" multiple accept="image/heic,image/heif,image/jpeg,image/png" onChange={handleImageChange} />
            <strong>拖入 / 粘贴 / 选择图片后自动生成事件</strong>
            <span>{image ? image.name : "未选择图片"}</span>
          </label>
          <p className="image-import-drop-hint">无需填写标题、主题或笔记；图片进入页面后会自动读取 EXIF、生成意义事件并准备同步。</p>
          {importError && <p className="image-import-error">{importError}</p>}
          {!image && <p className="image-import-empty">等待图片进入页面后自动生成</p>}
          {image?.previewUrl && <img className="image-import-preview" src={image.previewUrl} alt={image.name} />}
          <dl className="file-facts">
            <div><dt>文件名</dt><dd>{image?.name ?? "未选择"}</dd></div>
            <div><dt>文件类型</dt><dd>{image?.type ?? "未选择"}</dd></div>
            <div><dt>文件大小</dt><dd>{image ? formatBytes(image.size) : "未选择"}</dd></div>
            <div><dt>修改时间</dt><dd>{image ? formatLocalDateTime(image.lastModified) : "未选择"}</dd></div>
          </dl>
          <section className="batch-import-panel" aria-label="批量上传">
            <header>
              <div>
                <span>批量上传</span>
                <h3>上传进度</h3>
              </div>
              <strong>{batchProcessing ? "处理中" : batchProgressLabel}</strong>
            </header>
            <div className="batch-import-stats">
              <span>预览结果</span>
              <span>{batchItems.length ? `${batchItems.length} 张图片` : "等待批量选择图片"}</span>
              <span>错误 {batchFailedCount}</span>
            </div>
            <div
              className="batch-import-progressbar"
              role="progressbar"
              aria-label="批量上传处理进度"
              aria-valuemin={0}
              aria-valuemax={batchItems.length || 1}
              aria-valuenow={batchCompletedCount}
            >
              <i style={{ width: `${batchProgressPercent}%` }} />
            </div>
            <p className="batch-import-current">
              {batchActiveItem
                ? `正在执行下一步：${batchActiveItem.name}`
                : batchItems.length
                ? `批量处理完成 ${batchProgressLabel}`
                : "选择多张图片后会自动逐张读取证据、生成事件并写入记忆库。"}
            </p>
            <ul className="batch-import-list">
              {batchItems.map((item) => (
                <li key={item.id} data-state={item.status}>
                  {item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.name} />
                  ) : (
                    <div className="batch-import-placeholder">预览</div>
                  )}
                  <div>
                    <strong>{item.name}</strong>
                    <span>{formatBytes(item.size)} · {item.detail}</span>
                    {item.error && <em>错误：{item.error}</em>}
                  </div>
                </li>
              ))}
              {batchItems.length === 0 && (
                <li data-state="queued">
                  <div className="batch-import-placeholder">预览</div>
                  <div>
                    <strong>等待批量选择图片</strong>
                    <span>可以一次选择多张 HEIC / JPEG / PNG，并在这里查看进度和错误。</span>
                    <em>错误：暂无</em>
                  </div>
                </li>
              )}
            </ul>
          </section>
        </aside>

        <section className="evidence-panel workbench-panel">
          <header>
            <span>Step 2</span>
            <h2>坐标与地址证据</h2>
          </header>
          <EvidenceCard title="EXIF GPS" status={exifStatusLabel}>
            <p>
              {gpsEvidence
                ? "已从图片 EXIF 读取真实 WGS84 坐标。"
                : exifStatus === "reading"
                ? "正在本地读取图片 EXIF GPS。"
                : exifStatus === "unsupported"
                ? "当前浏览器端暂未解析 HEIC EXIF；请先用 JPEG 测试，或后续接入原生/服务端 HEIC 解析。"
                : "未读取到真实 EXIF GPS 前，不生成硬事实点位。"}
            </p>
            <dl>
              <div>
                <dt>WGS84</dt>
                <dd>{gpsEvidence ? `${gpsEvidence.longitude.toFixed(10)}, ${gpsEvidence.latitude.toFixed(10)}` : "暂无坐标证据"}</dd>
              </div>
              <div><dt>海拔</dt><dd>{gpsEvidence?.altitude === undefined ? "暂无真实数据" : `${gpsEvidence.altitude.toFixed(2)} m`}</dd></div>
              <div><dt>水平误差</dt><dd>{gpsEvidence?.horizontalError === undefined ? "暂无真实数据" : `${gpsEvidence.horizontalError.toFixed(2)} m`}</dd></div>
              <div><dt>evidence</dt><dd>{gpsEvidence ? "gps_exif" : "none"}</dd></div>
            </dl>
          </EvidenceCard>
          <EvidenceCard title={addressState.status === "ready" ? "高德地址" : "地址证据"} status={addressStatusLabel}>
            <p>
              {addressState.status === "ready"
                ? addressState.regeo.formattedAddress
                : addressState.status === "loading"
                ? "已获取 EXIF GPS，正在请求高德地址候选。"
                : addressState.status === "not_configured"
                ? "已获取 EXIF GPS；配置 VITE_AMAP_KEY 后可自动生成地址证据。"
                : addressState.status === "failed"
                ? `地址请求失败：${addressState.error}`
                : "等待真实坐标后再请求地址候选。"}
            </p>
            <dl>
              <div>
                <dt>GCJ-02</dt>
                <dd>{addressState.status === "ready" ? `${addressState.converted.longitude}, ${addressState.converted.latitude}` : "未请求"}</dd>
              </div>
              <div>
                <dt>道路</dt>
                <dd>{addressState.status === "ready" ? addressState.regeo.roads.map((road) => road.name).slice(0, 2).join(" / ") || "无道路候选" : "未请求"}</dd>
              </div>
              <div>
                <dt>POI</dt>
                <dd>{addressState.status === "ready" ? addressState.regeo.pois.map((poi) => poi.name).slice(0, 3).join(" / ") || "无 POI 候选" : "未请求"}</dd>
              </div>
            </dl>
          </EvidenceCard>
          <div className="mapbox-preview" aria-label="Mapbox 预览">
            <div className="map-grid" />
            <button className="map-pin" title="Mapbox confirmed GPS point" type="button">
              <span />
              Mapbox
            </button>
            <p>{gpsEvidence ? "Mapbox 使用 EXIF WGS84 坐标显示硬事实点位；地址只作为候选证据。" : "Mapbox 将在出现真实 WGS84 坐标后显示硬事实点位；地址只作为候选证据。"}</p>
          </div>
        </section>

        <section className="meaning-panel workbench-panel">
          <header>
            <span>Step 3</span>
            <h2>意义自动生成</h2>
          </header>
          <div className="auto-meaning-card" aria-live="polite">
            <span>事件标题</span>
            <strong>{visibleMeaningSummary?.title ?? "等待文件生成事件标题"}</strong>
            <small>
              {meaningGenerated
                ? "已由文件名和图片证据生成"
                : image
                ? "等待补充证据"
                : "等待图片"}
            </small>
          </div>
          <div className="meaning-output">
            <strong>{visibleMeaningSummary?.title ?? "等待文件生成事件标题"}</strong>
            <span>{visibleMeaningSummary?.activity ?? "自动等待"}</span>
            <p>{visibleMeaningSummary?.topics.join(" / ") ?? "暂无主题"}</p>
            <em>{visibleMeaningSummary?.placeMeaning ?? "awaiting_location_evidence"}</em>
          </div>
          <EvidenceCard title="图片意义" status={imageMeaningStatusLabel}>
            <p>
              {imageMeaningState.status === "ready"
                ? imageMeaningState.meaning.memoryMeaning
                : imageMeaningState.status === "loading"
                ? "正在把图片、EXIF GPS 和高德地址交给本地 Hermes 生成意义总结。"
                : imageMeaningState.status === "failed"
                ? `Hermes 总结失败：${imageMeaningState.error}`
                : imageMeaningState.status === "offline"
                ? "Hermes 未配置或未返回结果，当前使用本地文件名与证据生成摘要。"
                : "等待图片和坐标证据后请求 Hermes 视觉总结。"}
            </p>
            <dl>
              <div><dt>场景</dt><dd>{imageMeaningState.status === "ready" ? imageMeaningState.meaning.sceneSummary : "待生成"}</dd></div>
              <div><dt>主题</dt><dd>{imageMeaningState.status === "ready" ? imageMeaningState.meaning.topics.join(" / ") : "待生成"}</dd></div>
              <div><dt>地点角色</dt><dd>{imageMeaningState.status === "ready" ? imageMeaningState.meaning.placeRoleHint : "待生成"}</dd></div>
            </dl>
          </EvidenceCard>
          <div className="confidence-grid">
            <article><span>坐标</span><strong>{gpsEvidence ? "100%" : "0%"}</strong><small>{gpsEvidence ? "gps_exif" : "no_gps"}</small></article>
            <article><span>地址</span><strong>{addressState.status === "ready" ? "86%" : "0%"}</strong><small>{addressState.status === "ready" ? "amap" : addressState.status}</small></article>
            <article><span>图片</span><strong>{fileConfidence}%</strong><small>{image ? "file_selected" : "no_file"}</small></article>
            <article><span>意义</span><strong>{meaningGenerated ? (imageMeaningState.status === "ready" ? `${Math.round(imageMeaningState.meaning.confidence * 100)}%` : "100%") : "0%"}</strong><small>{imageMeaningState.status === "ready" ? "hermes" : meaningGenerated ? "auto_generated" : "waiting"}</small></article>
          </div>
          <section className="review-queue">
            <h3>证据审查</h3>
            <label><input type="checkbox" readOnly checked={Boolean(image)} /> 图片文件已选择</label>
            <label><input type="checkbox" readOnly checked={Boolean(gpsEvidence)} /> {gpsEvidence ? "EXIF GPS 已确认" : "等待真实 EXIF GPS"}</label>
            <label><input type="checkbox" readOnly checked={addressState.status === "ready"} /> {addressState.status === "ready" ? "地址候选已生成" : "等待地址候选"}</label>
            <label><input type="checkbox" readOnly checked={imageMeaningState.status === "ready"} /> {imageMeaningState.status === "ready" ? "Hermes 图片意义已生成" : "等待 Hermes 图片意义"}</label>
            <label><input type="checkbox" readOnly checked={meaningGenerated} /> 意义事件已生成</label>
            <label><input type="checkbox" readOnly checked={archived} /> {duplicateArchive ? "已存在，跳过重复写入" : "记忆事件已写入本地库，等待聚合"}</label>
          </section>
          {archiveFailed && <p className="image-import-error">同步失败：{archiveState.error}</p>}
          {duplicateArchive && <p className="image-import-drop-hint">已存在 · {archiveState.item.fileName} · 未重复上传</p>}
          {archivedJob && <p className="image-import-drop-hint">最近 payload · {archivedJob.payloadPreview}</p>}
          <div className="image-import-actions">
            <div>
              <strong>生成记忆事件</strong>
              <span>
	                {duplicateArchive
	                  ? "本地记忆库已有这张图片，未重复写入"
	                  : archived
	                  ? "已写入本地记忆库，等待同地点证据达到阈值"
	                  : archiving
	                  ? "正在生成 Hermes payload"
	                  : meaningGenerated
	                  ? "点击下一步生成记忆事件"
	                  : image
	                  ? "等待补充证据后继续"
	                  : "先选择图片后继续"}
              </span>
            </div>
            <button
              className="button-primary"
              type="button"
              disabled={!meaningGenerated || archiving}
              onClick={() => void handleArchiveMemory()}
            >
              {archiving ? "正在生成..." : duplicateArchive ? "已存在，未重复上传" : archived ? "已生成记忆事件" : "下一步：生成记忆事件"}
            </button>
          </div>
        </section>

        <section className="sync-panel workbench-panel">
          <header>
            <span>Step 4</span>
            <h2>世界同步</h2>
          </header>
          <div className="sync-flow">
            <article><strong>EventMeaning</strong><span>{worldSyncStatus.eventMeaning}</span></article>
            <article><strong>PlaceProfile</strong><span>{worldSyncStatus.placeProfile}</span></article>
            <article><strong>Layer 3</strong><span>{worldSyncStatus.layer3}</span></article>
            <article><strong>Godot world_state.json</strong><span>{worldSyncStatus.godotWorldState}</span></article>
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
      <MemoryLibraryDashboard onNavigate={onNavigate} />
    </AppShell>
  );
}

export function MemoryCreatePage({ onNavigate }: { onNavigate: NavigateHandler }) {
  return (
    <AppShell
      active="导入记忆"
      className="office-dashboard memory-import-dashboard"
      contentClassName="memory-child-stage"
      onNavigate={onNavigate}
    >
      <section className="image-import-page" aria-label="导入图片记忆">
        <header className="memory-import-header">
          <div>
            <h1>导入图片记忆</h1>
            <p>先从单张 HEIC / JPEG 图片开始，确认 EXIF、地址证据和意义事件，再同步到世界状态。</p>
          </div>
          <a
            href="/memory"
            className="button-secondary memory-return-link"
            onClick={(event) => onNavigate("memory", event)}
          >
            ← 返回记忆库
          </a>
        </header>
        <MediaMeaningWorkbench />
      </section>
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

  if (view === "memoryImport") {
    return <MemoryCreatePage onNavigate={navigate} />;
  }

  if (view === "game") {
    const room = typeof window === "undefined" ? "world" : getGameRoomFromSearch(window.location.search);
    return <GodotWebGamePage room={room} onNavigate={navigate} />;
  }

  return <IslandHomePage onNavigate={navigate} />;
}
