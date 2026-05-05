import type { MouseEvent, ReactNode } from "react";
import { gameAssets } from "../data/gameAssets";
import { getPathForView, type ViewKey } from "../viewRoutes";

export type NavigateHandler = (view: ViewKey, event?: MouseEvent<HTMLAnchorElement>) => void;

const navItems = [
  { label: "世界地图", icon: gameAssets.icons.mapPin, view: "world" },
  { label: "办公室", icon: gameAssets.icons.office, view: "office" },
  { label: "记忆馆", icon: gameAssets.icons.memory, view: "memory" },
  { label: "财务楼", icon: gameAssets.icons.finance },
  { label: "生活区", icon: gameAssets.icons.life },
  { label: "AI 研究所", icon: gameAssets.icons.ai },
  { label: "任务", icon: gameAssets.addon.icons.calendar },
  { label: "设置", icon: gameAssets.icons.settings },
] satisfies Array<{ label: string; icon: string; view?: ViewKey }>;

function IconButton({ icon, label, badge }: { icon: string; label: string; badge?: string }) {
  return (
    <button className="icon-button" type="button" title={label} aria-label={label}>
      <img src={icon} alt="" />
      {badge && <span>{badge}</span>}
    </button>
  );
}

export function TopBar() {
  return (
    <header className="top-bar">
      <section className="player-card" aria-label="玩家信息">
        <img className="player-avatar" src={gameAssets.player} alt="" />
        <div>
          <strong>Alex Chen</strong>
          <span>Lv.42</span>
          <div className="xp-track"><i style={{ width: "68%" }} /></div>
        </div>
        <em>68%</em>
      </section>

      <section className="location-weather" aria-label="城市天气">
        <div className="city-select">
          <img src={gameAssets.icons.mapPin} alt="" />
          <strong>杭州</strong>
          <span>Hangzhou</span>
          <b>⌄</b>
        </div>
        <div className="weather-state">
          <img src={gameAssets.addon.icons.energy} alt="" />
          <strong>24°C</strong>
          <span>晴 · 空气优 28</span>
        </div>
      </section>

      <section className="resource-bar" aria-label="资源">
        <span><img src={gameAssets.addon.icons.coin} alt="" />12,450</span>
        <span><img src={gameAssets.addon.badges.memory} alt="" />1,280</span>
        <span><img src={gameAssets.addon.icons.energy} alt="" />120/120</span>
        <button type="button" title="添加资源">+</button>
      </section>

      <nav className="quick-actions" aria-label="快捷操作">
        <IconButton icon={gameAssets.addon.icons.calendar} label="日历" />
        <IconButton icon={gameAssets.addon.icons.mail} label="消息" badge="3" />
        <IconButton icon={gameAssets.addon.buttons.checkboxChecked} label="待办" />
        <IconButton icon={gameAssets.addon.icons.settings} label="设置" />
        <button className="fullscreen-button" type="button" title="全屏" aria-label="全屏">⛶</button>
      </nav>
    </header>
  );
}

export function Sidebar({ active, onNavigate }: { active: string; onNavigate: NavigateHandler }) {
  return (
    <aside className="side-nav" aria-label="建筑导航">
      <nav>
        {navItems.map(({ label, icon, view }) => (
          <a
            className={label === active ? "active" : ""}
            href={view ? getPathForView(view) : "#"}
            key={label}
            onClick={(event) => view && onNavigate(view, event)}
          >
            <img src={icon} alt="" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <a className="return-button" href="/" onClick={(event) => onNavigate("world", event)}>← 返回岛屿</a>
    </aside>
  );
}

export function DesignCard({
  children,
  className = "",
  as: Tag = "section"
}: {
  children: ReactNode;
  className?: string;
  as?: "article" | "section" | "aside";
}) {
  return <Tag className={`design-card ${className}`.trim()}>{children}</Tag>;
}

export function AppShell({
  active,
  children,
  className,
  contentClassName = "main-stage",
  onNavigate,
  rightRail
}: {
  active: string;
  children: ReactNode;
  className: string;
  contentClassName?: string;
  onNavigate: NavigateHandler;
  rightRail?: ReactNode;
}) {
  return (
    <main className={`app-shell ${className}${rightRail ? "" : " app-shell--wide"}`}>
      <TopBar />
      <Sidebar active={active} onNavigate={onNavigate} />
      <section className={contentClassName}>
        {children}
      </section>
      {rightRail && <aside className="right-rail">{rightRail}</aside>}
    </main>
  );
}
