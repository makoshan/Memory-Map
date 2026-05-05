import type { AgentContextSnapshot, GameUnlock, Opportunity, PlaceProfile, WorldNode } from "../domain/types";

export type GodotWorldNode = {
  id: string;
  placeId: string;
  name: string;
  role: PlaceProfile["role"];
  room: string;
  assetKey: string;
  position: {
    x: number;
    y: number;
  };
  visual: {
    sizeScale: number;
    brightness: number;
    vegetationDensity: number;
    waterLevel: number;
    fogDensity: number;
    unlockLevel: number;
  };
  unlocks: string[];
  rooms: string[];
};

export type GodotWorldState = {
  schemaVersion: 1;
  generatedAt: string;
  source: "memory-map-layer1";
  bridge: {
    appShell: "tauri-react";
    gameLayer: "godot-4.6";
    contract: "Layer 1 semantic summary -> Layer 3 world state";
  };
  user: {
    id: string;
    displayName: string;
    day: number;
    level: number;
  };
  world: {
    id: string;
    title: string;
    baseMap: string;
    weather: string;
    theme: "wetland-pixel";
  };
  nodes: GodotWorldNode[];
  ai: {
    conclusion: string;
    suggestion: string;
    risk: string;
  };
  tasks: string[];
  opportunities: Array<{
    id: string;
    type: Opportunity["type"];
    title: string;
    suggestedTask: string;
    nodeId?: string;
    visualHint?: string;
  }>;
  timeline: Array<{
    year: string;
    title: string;
    note: string;
  }>;
};

const roleAssetKey: Record<PlaceProfile["role"], string> = {
  home: "home-lv2",
  work: "office-lv3",
  memory: "memory-lv3",
  finance: "finance-lv2",
  life: "life-lv2",
  recovery: "life-lv2",
  unknown: "home-lv1"
};

const defaultPositions = [
  { x: -330, y: -110 },
  { x: 0, y: -125 },
  { x: 330, y: -105 },
  { x: -300, y: 180 },
  { x: 20, y: 225 },
  { x: 355, y: 170 }
];

export function createGodotWorldState(input: {
  generatedAt?: string;
  userId: string;
  displayName: string;
  day: number;
  level: number;
  profiles: PlaceProfile[];
  worldNodes: WorldNode[];
  unlocks: GameUnlock[];
  opportunities?: Opportunity[];
  agentContext: AgentContextSnapshot;
  aiSuggestion: {
    conclusion: string;
    suggestion: string;
    risk: string;
  };
  timeline: Array<{
    year: string;
    title: string;
    note: string;
  }>;
}): GodotWorldState {
  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    source: "memory-map-layer1",
    bridge: {
      appShell: "tauri-react",
      gameLayer: "godot-4.6",
      contract: "Layer 1 semantic summary -> Layer 3 world state"
    },
    user: {
      id: input.userId,
      displayName: input.displayName,
      day: input.day,
      level: input.level
    },
    world: {
      id: "world-xixi-wetland",
      title: "西溪湿地",
      baseMap: "Mapbox / Hangzhou semantic cluster",
      weather: "24C sunny, AQI 28",
      theme: "wetland-pixel"
    },
    nodes: input.worldNodes.map((node, index) => {
      const profile = input.profiles.find((item) => item.placeId === node.placeId);
      const position = defaultPositions[index % defaultPositions.length];
      const nodeUnlocks = input.unlocks
        .filter((unlock) => unlock.placeId === node.placeId && unlock.visibleInLayer3)
        .map((unlock) => unlock.unlockKey);

      return {
        id: node.id,
        placeId: node.placeId,
        name: profile?.placeName ?? node.nodeType,
        role: profile?.role ?? "unknown",
        room: node.nodeType,
        assetKey: roleAssetKey[profile?.role ?? "unknown"],
        position,
        visual: {
          sizeScale: node.size,
          brightness: node.brightness,
          vegetationDensity: node.vegetationDensity,
          waterLevel: node.waterLevel,
          fogDensity: node.fogDensity,
          unlockLevel: node.unlockLevel
        },
        unlocks: nodeUnlocks,
        rooms: node.unlockedRooms
      };
    }),
    ai: input.aiSuggestion,
    tasks: input.agentContext.todayTasks,
    opportunities: (input.opportunities ?? []).slice(0, 3).map((opportunity) => ({
      id: opportunity.id,
      type: opportunity.type,
      title: opportunity.title,
      suggestedTask: opportunity.suggestedTask,
      nodeId: opportunity.layer3Expression?.nodeId,
      visualHint: opportunity.layer3Expression?.visualHint
    })),
    timeline: input.timeline
  };
}
