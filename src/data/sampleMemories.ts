import type { MemoryItem } from "../domain/memoryRoom";

export const sampleMemoryItems: MemoryItem[] = [
  {
    id: "mem-sample-1",
    type: "image",
    title: "杭州刘小龙展会看机器人",
    summary: "杭州刘小龙展会 · robotics / AI hardware",
    city: "杭州",
    capturedAt: "2026-05-03T16:13:13Z",
    capturedDate: "2026-05-03",
    topics: ["robotics", "AI hardware"],
    fileName: "IMG_9128.HEIC",
    fileSize: 4_200_000
  },
  {
    id: "mem-sample-2",
    type: "image",
    title: "深圳科技园午后",
    summary: "深圳科技园 · 城市记录",
    city: "深圳",
    capturedAt: "2026-04-20T14:02:00Z",
    capturedDate: "2026-04-20",
    topics: ["memory"],
    fileName: "DSC_0212_szx.jpg",
    fileSize: 3_100_000
  },
  {
    id: "mem-sample-3",
    type: "note",
    title: "西湖边的早晨",
    summary: "雾散了之后跑了 5km，看到第一只白鹭。",
    city: "杭州",
    capturedAt: "2026-04-12T07:20:00Z",
    capturedDate: "2026-04-12",
    topics: ["memory"],
    fileName: "西湖晨跑.md",
    fileSize: 612
  },
  {
    id: "mem-sample-4",
    type: "audio",
    title: "上海夜跑播客",
    summary: "外滩沿江 · 4.2 km · 32 min",
    city: "上海",
    capturedAt: "2026-03-28T20:11:00Z",
    capturedDate: "2026-03-28",
    topics: ["memory"],
    fileName: "shanghai_run_podcast.mp3",
    fileSize: 7_800_000
  },
  {
    id: "mem-sample-5",
    type: "image",
    title: "东京旧书店的午后",
    summary: "东京神保町 · 旧书 · 设计杂志",
    city: "东京",
    capturedAt: "2026-02-14T15:48:00Z",
    capturedDate: "2026-02-14",
    topics: ["design research"],
    fileName: "tokyo_jimbocho.jpg",
    fileSize: 2_600_000
  }
];
