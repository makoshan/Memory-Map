import type { ViewKey } from "../viewRoutes";
import { gameAssets } from "./gameAssets";

type PixelIslandPosition = {
  left: string;
  top: string;
  width: string;
  height: string;
  rotate?: string;
  zIndex?: number;
};

type PixelIslandLabelPosition = {
  left: string;
  top: string;
  zIndex?: number;
};

export type PixelIslandLayer = {
  key: string;
  kind: "spot" | "prop" | "character";
  sprite: string;
  position: PixelIslandPosition;
  labelPosition?: PixelIslandLabelPosition;
  label?: string;
  level?: string;
  icon?: string;
  view?: ViewKey;
  ariaLabel?: string;
};

export type PixelIslandPack = {
  slug: string;
  city: string;
  title: string;
  level: string;
  background: string;
  sceneImage: string;
  atlas: string;
  spritesManifest: string;
  compositePreview: string;
  prompts: {
    background: string;
    sprites: string;
  };
  layers: PixelIslandLayer[];
};

const spriteRoot = "/assets/generated/v2/hangzhou-sprites";
const sprite = (name: string) => `${spriteRoot}/${name}.png`;

export const hangzhouPixelIslandPack: PixelIslandPack = {
  slug: "hangzhou",
  city: "杭州",
  title: "杭州像素岛屿",
  level: "城市 Lv.10",
  background: "/assets/generated/v2/hangzhou-background.png",
  sceneImage: "/assets/generated/v2/hangzhou-island-composite-preview.png",
  atlas: "/assets/generated/v2/hangzhou-atlas.png",
  spritesManifest: "/assets/generated/v2/hangzhou-sprites/manifest.json",
  compositePreview: "/assets/generated/v2/hangzhou-island-composite-preview.png",
  prompts: {
    background: "/assets/generated/v2/hangzhou-background.prompt.txt",
    sprites: "/assets/generated/v2/hangzhou-sprites/prompt-used.txt"
  },
  layers: [
    {
      key: "office",
      kind: "spot",
      label: "办公室",
      level: "Lv.8",
      icon: gameAssets.icons.office,
      sprite: sprite("office-tower-island"),
      view: "office",
      ariaLabel: "进入办公室",
      labelPosition: { left: "19%", top: "31%", zIndex: 72 },
      position: { left: "6.5%", top: "32%", width: "20%", height: "31%", zIndex: 24 }
    },
    {
      key: "memory",
      kind: "spot",
      label: "记忆馆",
      level: "Lv.7",
      icon: gameAssets.icons.memory,
      sprite: sprite("memory-museum-island"),
      view: "memory",
      ariaLabel: "进入记忆馆",
      labelPosition: { left: "49%", top: "30%", zIndex: 72 },
      position: { left: "39%", top: "28%", width: "20%", height: "29%", zIndex: 26 }
    },
    {
      key: "finance",
      kind: "spot",
      label: "财务楼",
      level: "Lv.6",
      icon: gameAssets.icons.finance,
      sprite: sprite("finance-tower-island"),
      labelPosition: { left: "78%", top: "33%", zIndex: 72 },
      position: { left: "70%", top: "34%", width: "19%", height: "31%", zIndex: 25 }
    },
    {
      key: "life",
      kind: "spot",
      label: "生活区",
      level: "Lv.5",
      icon: gameAssets.icons.life,
      sprite: sprite("life-sports-island"),
      labelPosition: { left: "14%", top: "55%", zIndex: 72 },
      position: { left: "5%", top: "57%", width: "23%", height: "28%", zIndex: 28 }
    },
    {
      key: "home",
      kind: "spot",
      label: "家",
      level: "Lv.10",
      icon: gameAssets.icons.home,
      sprite: sprite("home-island"),
      labelPosition: { left: "51%", top: "54%", zIndex: 74 },
      position: { left: "40%", top: "55%", width: "21%", height: "32%", zIndex: 34 }
    },
    {
      key: "ai",
      kind: "spot",
      label: "AI 研究所",
      level: "Lv.7",
      icon: gameAssets.icons.ai,
      sprite: sprite("ai-lab-island"),
      labelPosition: { left: "84%", top: "57%", zIndex: 74 },
      position: { left: "73%", top: "61%", width: "19%", height: "27%", zIndex: 32 }
    },
    {
      key: "bridge-home-ai",
      kind: "prop",
      sprite: sprite("wood-footbridge"),
      position: { left: "61%", top: "66%", width: "12%", height: "10%", rotate: "8deg", zIndex: 29 }
    },
    {
      key: "bridge-home-life",
      kind: "prop",
      sprite: sprite("stone-arch-bridge"),
      position: { left: "28%", top: "63%", width: "15%", height: "12%", rotate: "-4deg", zIndex: 27 }
    },
    {
      key: "lighthouse",
      kind: "prop",
      sprite: sprite("lighthouse-island"),
      position: { left: "64%", top: "73%", width: "12%", height: "22%", zIndex: 36 }
    },
    {
      key: "sailboat",
      kind: "prop",
      sprite: sprite("sailboat"),
      position: { left: "29%", top: "81%", width: "8%", height: "10%", zIndex: 38 }
    },
    {
      key: "tour-boat",
      kind: "prop",
      sprite: sprite("tour-boat"),
      position: { left: "91%", top: "48%", width: "7.5%", height: "8%", zIndex: 18 }
    },
    {
      key: "player",
      kind: "character",
      sprite: sprite("avatar-male"),
      position: { left: "50%", top: "64%", width: "4.2%", height: "13%", zIndex: 48 }
    },
    {
      key: "researcher",
      kind: "character",
      sprite: sprite("avatar-researcher"),
      position: { left: "17%", top: "42%", width: "4.1%", height: "12.5%", zIndex: 46 }
    },
    {
      key: "robot",
      kind: "character",
      sprite: sprite("ai-robot"),
      position: { left: "82%", top: "65%", width: "4.7%", height: "13%", zIndex: 47 }
    }
  ]
};
