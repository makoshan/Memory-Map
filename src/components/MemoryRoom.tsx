import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { DesignCard, type NavigateHandler } from "./AppShell";
import { gameAssets } from "../data/gameAssets";
import {
  buildMemoryItem,
  groupByCity,
  type MemoryItem,
  type ProcessingFile
} from "../domain/memoryRoom";
import { sampleMemoryItems } from "../data/sampleMemories";

const memoryScene = "/assets/memory-room/scene.jpg";

const ACCEPTED_TYPES = "image/*,audio/*,text/plain,text/markdown,.md,.txt";

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}

async function fileToProcessingFile(file: File): Promise<ProcessingFile> {
  const isImage = file.type.startsWith("image/");
  const isAudio = file.type.startsWith("audio/");
  const isNote =
    file.type.startsWith("text/") || /\.(md|txt)$/i.test(file.name);

  const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
  const noteText = isNote ? await readFileAsText(file) : undefined;

  return {
    name: file.name,
    size: file.size,
    type: isImage ? "image" : isAudio ? "audio" : "note",
    lastModified: file.lastModified,
    previewUrl,
    noteText
  };
}

function MemoryHeroCard() {
  return (
    <DesignCard className="scene-card memory-scene-card">
      <img className="memory-scene" src={memoryScene} alt="记忆馆像素风场景" />
      <article className="scene-info">
        <header>
          <h1>记忆馆</h1>
          <span>Lv.7</span>
          <button type="button" aria-label="记忆馆说明">i</button>
        </header>
        <p className="scene-progress">5,600 / 8,000</p>
        <div className="progress-track"><i style={{ width: "70%" }} /></div>
        <p>存放你人生重要的记忆。AI 会从照片、笔记和音频里提炼成事件，并把它们放回城市地图。</p>
      </article>
    </DesignCard>
  );
}

function BatchImportZone({ onFiles, processing }: { onFiles: (files: FileList) => void; processing: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFiles(event.target.files);
      event.target.value = "";
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFiles(event.dataTransfer.files);
    }
  };

  return (
    <DesignCard className="memory-batch-card">
      <header>
        <h2>批量导入</h2>
        <span>支持照片 · 音频 · 笔记</span>
      </header>
      <label
        className={`memory-drop-zone${dragOver ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleChange}
        />
        <strong>把文件拖进来 / 点击选择</strong>
        <span>HEIC · JPG · PNG · MP3 · WAV · MD · TXT</span>
        {processing > 0 && <em className="memory-processing">AI 正在解析 {processing} 个文件…</em>}
      </label>
      <ul className="memory-import-tips">
        <li>EXIF GPS 会用于硬定位，文件名提到城市会作为辅助证据。</li>
        <li>笔记里出现地名 / 时间词会被抽出为事件标题。</li>
        <li>原始文件不离开本机，只把语义摘要写入世界状态。</li>
      </ul>
    </DesignCard>
  );
}

function MemoryGrid({ items }: { items: MemoryItem[] }) {
  const visible = items.slice(0, 8);
  return (
    <DesignCard className="memory-grid-card">
      <header>
        <h2>2024 年记忆</h2>
        <nav className="memory-tab-row">
          {["全部", "杭州", "深圳", "上海", "东京"].map((label, index) => (
            <button key={label} type="button" className={index === 0 ? "active" : ""}>{label}</button>
          ))}
        </nav>
      </header>
      <div className="memory-grid">
        {visible.map((item) => (
          <article key={item.id} className={`memory-card memory-card--${item.type}`}>
            {item.thumbnailUrl ? (
              <img src={item.thumbnailUrl} alt={item.title} />
            ) : (
              <div className="memory-card-placeholder" data-type={item.type}>
                {item.type === "audio" ? "♪" : item.type === "note" ? "✒" : "📷"}
              </div>
            )}
            <strong>{item.title}</strong>
            <span>{item.city ?? "未分配"} · {item.capturedDate}</span>
            <em>{item.summary}</em>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="memory-grid-empty">还没有导入记忆。把照片或笔记拖进上面的区域，AI 会自动建卡。</p>
        )}
      </div>
    </DesignCard>
  );
}

function MemoryCityMap({ items }: { items: MemoryItem[] }) {
  const cityRows = useMemo(() => groupByCity(items), [items]);
  const total = items.length;

  return (
    <DesignCard className="memory-city-card">
      <header>
        <h2>城市分布</h2>
        <span>{total} 条记忆</span>
      </header>
      <ul className="memory-city-list">
        {cityRows.map((row) => (
          <li key={row.city}>
            <span>{row.city}</span>
            <div className="progress-track"><i style={{ width: `${row.share * 100}%` }} /></div>
            <strong>{row.count}</strong>
          </li>
        ))}
        {cityRows.length === 0 && <li className="memory-city-empty">导入后会按城市聚合到这里。</li>}
      </ul>
    </DesignCard>
  );
}

function MemorySummaryCard({ items }: { items: MemoryItem[] }) {
  const lines = useMemo(() => {
    if (items.length === 0) {
      return ["还没有素材，先导入几张照片或笔记。", "—", "—"];
    }
    const cities = Array.from(new Set(items.map((item) => item.city).filter(Boolean))) as string[];
    const topics = Array.from(
      new Set(items.flatMap((item) => item.topics))
    ).slice(0, 3);
    return [
      `共 ${items.length} 条记忆，覆盖 ${cities.length} 个城市。`,
      `最近主题：${topics.join("、") || "memory"}。`,
      `下一步：把 ${items.length > 0 ? items[0].title : "事件"} 加入「人生轨迹」。`
    ];
  }, [items]);

  return (
    <DesignCard className="memory-summary-card">
      <header>
        <h2>AI 总结</h2>
        <span>三行回顾</span>
      </header>
      <ol>
        <li><strong>结论</strong><span>{lines[0]}</span></li>
        <li><strong>建议</strong><span>{lines[1]}</span></li>
        <li><strong>风险</strong><span>{lines[2]}</span></li>
      </ol>
    </DesignCard>
  );
}

export function MemoryRoomRail({ items }: { items: MemoryItem[] }) {
  const total = items.length;
  return (
    <>
      <DesignCard className="stats-card">
        <h2>记忆属性</h2>
        <dl>
          <dt>存储空间</dt><dd>{(total * 0.05 + 5.4).toFixed(1)} GB / 10 GB</dd>
          <dt>整理效率</dt><dd className="positive">125%</dd>
          <dt>AI 分析</dt><dd>已开启</dd>
          <dt>每日整理上限</dt><dd>200 条</dd>
        </dl>
      </DesignCard>
      <DesignCard className="upgrade-card">
        <h2>升级效果</h2>
        <p>下一等级: <strong>Lv.8</strong></p>
        <ul>
          <li><img src={gameAssets.addon.icons.coin} alt="" />存储 <span>+5 GB</span></li>
          <li><img src={gameAssets.addon.badges.energy} alt="" />分析速度 <span>+20%</span></li>
          <li><img src={gameAssets.addon.icons.user} alt="" />日上限 <span>+50</span></li>
        </ul>
        <button type="button">升级</button>
        <footer>
          <span><img src={gameAssets.addon.icons.coin} alt="" />8,000</span>
          <span><img src={gameAssets.addon.badges.memory} alt="" />120</span>
        </footer>
      </DesignCard>
    </>
  );
}

export function MemoryRoomDashboard({ onChange }: { onChange?: (items: MemoryItem[]) => void; onNavigate?: NavigateHandler }) {
  const [items, setItems] = useState<MemoryItem[]>(sampleMemoryItems);
  const [processing, setProcessing] = useState(0);

  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    setProcessing((current) => current + files.length);
    try {
      const processed = await Promise.all(files.map(fileToProcessingFile));
      const newItems = processed.map((entry, index) =>
        buildMemoryItem(entry, { sequence: items.length + index })
      );
      const next = [...newItems, ...items];
      setItems(next);
      onChange?.(next);
    } finally {
      setProcessing((current) => Math.max(0, current - files.length));
    }
  };

  return (
    <section className="memory-room" aria-label="记忆馆">
      <MemoryHeroCard />
      <div className="memory-room-grid">
        <BatchImportZone onFiles={handleFiles} processing={processing} />
        <MemoryGrid items={items} />
        <MemoryCityMap items={items} />
        <MemorySummaryCard items={items} />
      </div>
    </section>
  );
}
