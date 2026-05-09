import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { DesignCard, type NavigateHandler } from "./AppShell";
import { gameAssets } from "../data/gameAssets";
import { hangzhouPixelIslandPack } from "../data/pixelIslandPacks";
import {
  buildAgentContext,
  buildMediaAsset,
  buildMemoryItem,
  groupByCity,
  type MemoryItem,
  type ProcessingFile
} from "../domain/memoryRoom";
import { sampleMemoryItems } from "../data/sampleMemories";
import { sendMediaAssetToHermes } from "../integrations/hermesAgent";
import { parseExifGpsFromArrayBuffer, type ExifGpsEvidence } from "../integrations/exifGps";
import {
  loadStoredHermesJobs,
  loadStoredMemoryItems,
  saveStoredHermesJobs,
  saveStoredMemoryItems
} from "../integrations/localStore";
import type { HermesAnalysisJob } from "../domain/types";
import { createGpsWorldSyncEvidence } from "../domain/worldSyncPipeline";

type HermesJobView = HermesAnalysisJob & {
  gatewayStatus: "offline" | "sent" | "failed";
  payloadPreview: string;
};

const memoryScene = "/assets/memory-room/scene.jpg";
const memoryMuseumSprite =
  hangzhouPixelIslandPack.layers.find((layer) => layer.key === "memory")?.sprite ??
  "/assets/generated/v2/hangzhou-sprites/memory-museum-island.png";

const ACCEPTED_TYPES = "image/*,audio/*,text/plain,text/markdown,.md,.txt";

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}

function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${mimeType || "application/octet-stream"};base64,${btoa(binary)}`;
}

type ProcessingFileOptions = {
  parseGps?: (buffer: ArrayBuffer) => ExifGpsEvidence | undefined;
  createPreviewDataUrl?: (file: File) => Promise<string | undefined>;
};

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image preview"));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Image preview read returned no text"));
    };
    reader.readAsDataURL(blob);
  });
}

function loadPreviewImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Browser could not decode image preview"));
    image.onload = () => resolve(image);
    image.src = dataUrl;
  });
}

async function createThumbnailDataUrl(file: File) {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return undefined;
  }

  try {
    const dataUrl = await readBlobAsDataUrl(file);
    const image = await loadPreviewImage(dataUrl);
    const maxEdge = 360;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}

export async function fileToProcessingFile(file: File, options: ProcessingFileOptions = {}): Promise<ProcessingFile> {
  const isImage = file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|gif|webp)$/i.test(file.name);
  const isAudio = file.type.startsWith("audio/");
  const isNote =
    file.type.startsWith("text/") || /\.(md|txt)$/i.test(file.name);

  const imageBuffer = isImage ? await file.arrayBuffer() : undefined;
  const previewUrl = isImage ? await (options.createPreviewDataUrl ?? createThumbnailDataUrl)(file) : undefined;
  const gps = imageBuffer ? (options.parseGps ?? parseExifGpsFromArrayBuffer)(imageBuffer) : undefined;
  const noteText = isNote ? await readFileAsText(file) : undefined;

  return {
    name: file.name,
    size: file.size,
    type: isImage ? "image" : isAudio ? "audio" : "note",
    lastModified: file.lastModified,
    previewUrl,
    noteText,
    syncEvidence: gps
      ? createGpsWorldSyncEvidence({
          longitude: gps.longitude,
          latitude: gps.latitude,
          capturedAt: new Date(file.lastModified).toISOString(),
          hermesSucceeded: false
        })
      : undefined
  };
}

function MemoryHeroCard() {
  return (
    <DesignCard
      className="scene-card memory-scene-card memory-museum-game-stage"
      data-memory-sprites-manifest={hangzhouPixelIslandPack.spritesManifest}
      data-godot-room-entry="memory"
    >
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
      <aside
        className="memory-museum-entry"
        aria-label="记忆馆游戏入口"
        data-memory-sprites-manifest={hangzhouPixelIslandPack.spritesManifest}
        data-godot-room-entry="memory"
      >
        <img src={memoryMuseumSprite} alt="" />
        <div>
          <span>切图清单</span>
          <strong>记忆馆像素岛</strong>
          <small>{hangzhouPixelIslandPack.spritesManifest}</small>
        </div>
        <a className="button-primary memory-game-link" href="/game?room=memory">
          进入记忆馆游戏
        </a>
      </aside>
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

function MemoryGrid({ items, statusByItem }: { items: MemoryItem[]; statusByItem: Record<string, HermesJobView["gatewayStatus"]> }) {
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
        {visible.map((item) => {
          const status = statusByItem[item.id];
          const statusLabel =
            status === "sent" ? "AI 已分析" : status === "offline" ? "AI 离线就绪" : status === "failed" ? "AI 失败" : null;
          return (
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
              {statusLabel && (
                <b className={`memory-card-status memory-card-status--${status}`}>{statusLabel}</b>
              )}
            </article>
          );
        })}
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

async function dispatchHermes(file: ProcessingFile, item: MemoryItem): Promise<HermesJobView> {
  const asset = buildMediaAsset(file, item);
  const context = buildAgentContext(item);
  try {
    const result = await sendMediaAssetToHermes(asset, context);
    const job = "job" in result ? result.job : ({} as HermesAnalysisJob);
    const payloadPreview = JSON.stringify(result.payload, null, 2);
    if (result.status === "offline") {
      return { ...job, gatewayStatus: "offline", payloadPreview };
    }
    return { ...job, gatewayStatus: "sent", payloadPreview };
  } catch (error) {
    return {
      id: `hermes-job-${item.id}`,
      mediaAssetId: item.id,
      jobType: "media-analysis",
      inputSummary: `${item.fileName}`,
      status: "failed",
      createdAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      gatewayStatus: "failed",
      payloadPreview: ""
    };
  }
}

function HermesStatusCard({ jobs, gatewayUrl }: { jobs: HermesJobView[]; gatewayUrl?: string }) {
  const counts = useMemo(() => {
    const total = jobs.length;
    const offline = jobs.filter((job) => job.gatewayStatus === "offline").length;
    const sent = jobs.filter((job) => job.gatewayStatus === "sent").length;
    const failed = jobs.filter((job) => job.gatewayStatus === "failed").length;
    return { total, offline, sent, failed };
  }, [jobs]);
  const last = jobs[0];

  return (
    <DesignCard className="memory-hermes-card">
      <header>
        <h2>AI 处理状态</h2>
        <span className={`hermes-tag hermes-tag--${gatewayUrl ? "online" : "offline"}`}>
          {gatewayUrl ? "Hermes 网关已连接" : "Hermes 离线 · 仅生成 payload"}
        </span>
      </header>
      <dl className="hermes-counts">
        <div><dt>本次任务</dt><dd>{counts.total}</dd></div>
        <div><dt>已发送</dt><dd className="positive">{counts.sent}</dd></div>
        <div><dt>离线 payload</dt><dd>{counts.offline}</dd></div>
        <div><dt>失败</dt><dd className={counts.failed ? "warn" : ""}>{counts.failed}</dd></div>
      </dl>
      {!gatewayUrl && (
        <p className="hermes-hint">在 <code>.env.local</code> 设置 <code>VITE_HERMES_GATEWAY_URL</code> 即可把 payload 真实发到 Hermes 网关。</p>
      )}
      {last && (
        <details className="hermes-payload">
          <summary>最近 payload · {last.inputSummary || last.mediaAssetId}</summary>
          <pre>{last.payloadPreview || JSON.stringify({ error: last.error }, null, 2)}</pre>
        </details>
      )}
      {jobs.length === 0 && <p className="hermes-empty">还没有触发 AI 处理。导入一张照片或一段笔记，Hermes 会立刻收到语义 payload。</p>}
    </DesignCard>
  );
}

function MemoryImportCta({ onNavigate }: { onNavigate?: NavigateHandler }) {
  return (
    <DesignCard className="memory-import-cta" as="article">
      <header>
        <h2>导入记忆</h2>
        <span>上传 / 生成</span>
      </header>
      <p>把 HEIC / JPEG 图片、音频或笔记导入成可审查的记忆事件，再同步到语义世界状态。</p>
      <a href="/memory/import" onClick={(event) => onNavigate?.("memoryImport", event)} className="button-primary">
        + 导入新记忆
      </a>
    </DesignCard>
  );
}

function MemoryReturnCta({ onNavigate }: { onNavigate?: NavigateHandler }) {
  return (
    <a
      href="/memory"
      className="button-secondary memory-return-link"
      onClick={(event) => onNavigate?.("memory", event)}
    >
      ← 返回记忆库
    </a>
  );
}

function deriveStatusByItem(jobs: HermesAnalysisJob[]): Record<string, HermesJobView["gatewayStatus"]> {
  const map: Record<string, HermesJobView["gatewayStatus"]> = {};
  for (const job of jobs) {
    if (!job.mediaAssetId) continue;
    if (job.status === "failed") {
      map[job.mediaAssetId] = "failed";
    } else if (job.status === "completed") {
      map[job.mediaAssetId] = "sent";
    } else {
      map[job.mediaAssetId] = map[job.mediaAssetId] ?? "offline";
    }
  }
  return map;
}

export function MemoryLibraryDashboard({ onNavigate }: { onNavigate?: NavigateHandler }) {
  const [items, setItems] = useState<MemoryItem[]>(sampleMemoryItems);
  const [statusByItem, setStatusByItem] = useState<Record<string, HermesJobView["gatewayStatus"]>>({});
  const [jobs, setJobs] = useState<HermesJobView[]>([]);
  const [processing, setProcessing] = useState(0);
  const gatewayUrl = import.meta.env.VITE_HERMES_GATEWAY_URL as string | undefined;

  useEffect(() => {
    const stored = loadStoredMemoryItems(sampleMemoryItems);
    setItems(stored);
    const storedJobs = loadStoredHermesJobs([]);
    setStatusByItem(deriveStatusByItem(storedJobs));
    setJobs(
      storedJobs.map((job) => ({
        ...job,
        gatewayStatus: job.status === "failed" ? "failed" : job.status === "completed" ? "sent" : "offline",
        payloadPreview: job.outputJson ?? ""
      }))
    );
  }, []);

  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    setProcessing((current) => current + files.length);
    try {
      const processed = await Promise.all(files.map((file) => fileToProcessingFile(file)));
      const newItems = processed.map((entry, index) =>
        buildMemoryItem(entry, { sequence: items.length + index })
      );
      const next = [...newItems, ...items];
      setItems(next);
      saveStoredMemoryItems(next);

      const jobResults = await Promise.all(
        processed.map((entry, index) => dispatchHermes(entry, newItems[index]))
      );
      const nextJobs = [...jobResults, ...jobs];
      setJobs(nextJobs);
      saveStoredHermesJobs(nextJobs);
      setStatusByItem((current) => {
        const updated = { ...current };
        jobResults.forEach((job) => {
          if (job.mediaAssetId) updated[job.mediaAssetId] = job.gatewayStatus;
        });
        return updated;
      });
    } finally {
      setProcessing((current) => Math.max(0, current - files.length));
    }
  };

  return (
    <section className="memory-room" aria-label="记忆馆">
      <MemoryHeroCard />
      <div className="memory-room-grid">
        <MemoryDropImportCard onFiles={handleFiles} processing={processing} onNavigate={onNavigate} />
        <MemoryGrid items={items} statusByItem={statusByItem} />
        <MemoryCityMap items={items} />
        <MemorySummaryCard items={items} />
        <HermesStatusCard jobs={jobs} gatewayUrl={gatewayUrl} />
      </div>
    </section>
  );
}

function MemoryDropImportCard({
  onFiles,
  processing,
  onNavigate
}: {
  onFiles: (files: FileList) => void;
  processing: number;
  onNavigate?: NavigateHandler;
}) {
  return (
    <DesignCard className="memory-import-cta memory-import-cta--active" as="article">
      <header>
        <h2>导入记忆</h2>
        <span>批量 / 拖拽</span>
      </header>
      <BatchImportZone onFiles={onFiles} processing={processing} />
      <a
        href="/memory/import"
        onClick={(event) => onNavigate?.("memoryImport", event)}
        className="button-secondary memory-deep-link"
      >
        单文件深度导入 →
      </a>
    </DesignCard>
  );
}

export function MemoryRoomDashboard({ onNavigate }: { onNavigate?: NavigateHandler }) {
  const [items, setItems] = useState<MemoryItem[]>(() => loadStoredMemoryItems(sampleMemoryItems));
  const [processing, setProcessing] = useState(0);
  const [jobs, setJobs] = useState<HermesJobView[]>(() => {
    const stored = loadStoredHermesJobs([]);
    return stored.map((job) => ({
      ...job,
      gatewayStatus: job.status === "failed" ? "failed" : job.status === "completed" ? "sent" : "offline",
      payloadPreview: job.outputJson ?? ""
    }));
  });
  const [statusByItem, setStatusByItem] = useState<Record<string, HermesJobView["gatewayStatus"]>>(() =>
    deriveStatusByItem(loadStoredHermesJobs([]))
  );
  const gatewayUrl = import.meta.env.VITE_HERMES_GATEWAY_URL as string | undefined;

  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    setProcessing((current) => current + files.length);
    try {
      const processed = await Promise.all(files.map((file) => fileToProcessingFile(file)));
      const newItems = processed.map((entry, index) =>
        buildMemoryItem(entry, { sequence: items.length + index })
      );
      const next = [...newItems, ...items];
      setItems(next);
      saveStoredMemoryItems(next);

      const jobResults = await Promise.all(
        processed.map((entry, index) => dispatchHermes(entry, newItems[index]))
      );
      const nextJobs = [...jobResults, ...jobs];
      setJobs(nextJobs);
      saveStoredHermesJobs(nextJobs);
      setStatusByItem((current) => {
        const updated = { ...current };
        jobResults.forEach((job) => {
          if (job.mediaAssetId) updated[job.mediaAssetId] = job.gatewayStatus;
        });
        return updated;
      });
    } finally {
      setProcessing((current) => Math.max(0, current - files.length));
    }
  };

  const recentlyImported = items.slice(0, 3);
  return (
    <section className="memory-room memory-room--import" aria-label="导入记忆">
      <header className="memory-import-header">
        <div>
          <h1>导入记忆</h1>
          <p>把照片、音频和笔记交给 Hermes，自动建卡 + 城市归档。</p>
        </div>
        <MemoryReturnCta onNavigate={onNavigate} />
      </header>
      <div className="memory-import-grid">
        <BatchImportZone onFiles={handleFiles} processing={processing} />
        <HermesStatusCard jobs={jobs} gatewayUrl={gatewayUrl} />
        <MemoryCityMap items={items} />
        <MemorySummaryCard items={items} />
      </div>
      {recentlyImported.length > 0 && (
        <DesignCard className="memory-recent-card">
          <header>
            <h2>最近导入</h2>
            <span>{statusByItem ? "" : ""}已写入本地存储 · 在记忆馆 /memory 中可查看</span>
          </header>
          <ul className="memory-recent-list">
            {recentlyImported.map((item) => {
              const status = statusByItem[item.id];
              return (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.city ?? "未分配"} · {item.capturedDate}</span>
                  <em>{item.summary}</em>
                  {status && <b className={`memory-card-status memory-card-status--${status}`}>{status === "sent" ? "AI 已分析" : status === "offline" ? "AI 离线就绪" : "AI 失败"}</b>}
                </li>
              );
            })}
          </ul>
        </DesignCard>
      )}
    </section>
  );
}
