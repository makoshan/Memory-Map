const base = "/assets/generated/v2/sprites";
const addon = "/assets/generated/v2/addon-sprites";
const cut = "/assets/game/sprites";

export const gameAssets = {
  atlas: "/assets/generated/v2/world-atlas.png",
  uiAtlas: "/assets/generated/v2/ui-atlas.png",
  cut: {
    office: `${cut}/office-island.png`,
    memory: `${cut}/memory-museum-island.png`,
    finance: `${cut}/finance-tower-island.png`,
    recovery: `${cut}/recovery-garden-island.png`,
    home: `${cut}/home-base-island.png`,
    aiLab: `${cut}/ai-research-lab-island.png`,
    lighthouse: `${cut}/lighthouse-island.png`,
    woodBridge: `${cut}/wood-bridge.png`,
    reedPatch: `${cut}/reed-patch.png`,
    flowerPatch: `${cut}/flower-patch.png`,
    playerAlex: `${cut}/player-alex.png`,
    agents: {
      researcher: `${cut}/agent-researcher.png`,
      analyst: `${cut}/agent-analyst.png`,
      assistant: `${cut}/agent-assistant.png`,
      designer: `${cut}/agent-designer.png`,
      data: `${cut}/agent-data.png`,
      bot: `${cut}/agent-bot.png`
    }
  },
  office: `${base}/office-lv3.png`,
  memory: `${base}/memory-lv3.png`,
  finance: `${base}/finance-lv2.png`,
  recovery: `${base}/life-lv2.png`,
  home: `${base}/home-lv2.png`,
  aiLab: `${base}/ai-lab-lv3.png`,
  lighthouse: `${base}/lighthouse.png`,
  bridge: `${base}/bridge-wood.png`,
  reeds: `${base}/reed-patch.png`,
  flowers: `${base}/flower-bed.png`,
  player: `${base}/char-male.png`,
  rooms: {
    office: `${base}/room-office.png`,
    memory: `${base}/room-memory.png`,
    finance: `${base}/room-finance.png`,
    life: `${base}/room-life.png`,
    aiLab: `${base}/room-ai-lab.png`
  },
  terrain: {
    islandSmall: `${base}/island-small.png`,
    islandMedium: `${base}/island-medium.png`,
    islandLarge: `${base}/island-large.png`,
    islandLake: `${base}/island-lake.png`
  },
  icons: {
    home: `${base}/icon-home.png`,
    office: `${base}/icon-office.png`,
    memory: `${base}/icon-memory.png`,
    finance: `${base}/icon-finance.png`,
    ai: `${base}/icon-ai.png`,
    life: `${base}/icon-life.png`,
    mapPin: `${base}/icon-map-pin.png`,
    calendar: `${base}/icon-calendar.png`,
    camera: `${base}/icon-camera.png`,
    settings: `${base}/icon-settings.png`,
    menu: `${base}/icon-menu.png`
  },
  badges: [
    `${base}/badge-lv1.png`,
    `${base}/badge-lv2.png`,
    `${base}/badge-lv3.png`,
    `${base}/badge-lv4.png`,
    `${base}/badge-lv5.png`,
    `${base}/badge-lv6.png`
  ],
  addon: {
    cards: {
      status: `${addon}/card-blank-status.png`,
      task: `${addon}/card-blank-task.png`,
      progress: `${addon}/card-blank-progress.png`,
      agent: `${addon}/card-blank-agent.png`,
      worldMap: `${addon}/panel-world-map.png`
    },
    buttons: {
      blue: `${addon}/button-blue.png`,
      white: `${addon}/button-white.png`,
      green: `${addon}/button-green.png`,
      checkboxEmpty: `${addon}/checkbox-empty.png`,
      checkboxChecked: `${addon}/checkbox-checked.png`
    },
    icons: {
      plus: `${addon}/icon-plus.png`,
      search: `${addon}/icon-search.png`,
      user: `${addon}/icon-user.png`,
      bell: `${addon}/icon-bell.png`,
      mail: `${addon}/icon-mail.png`,
      star: `${addon}/icon-star.png`,
      flag: `${addon}/icon-flag.png`,
      gift: `${addon}/icon-gift.png`,
      trophy: `${addon}/icon-trophy.png`,
      chartBars: `${addon}/icon-chart-bars.png`,
      lineChart: `${addon}/icon-line-chart.png`,
      hourglass: `${addon}/icon-hourglass.png`,
      energy: `${addon}/icon-energy.png`,
      waterDrop: `${addon}/icon-water-drop.png`,
      calendar: `${addon}/icon-calendar.png`,
      camera: `${addon}/icon-camera.png`,
      heart: `${addon}/icon-heart.png`,
      coin: `${addon}/icon-coin.png`,
      aiNode: `${addon}/icon-ai-node.png`,
      settings: `${addon}/icon-settings.png`,
      menu: `${addon}/icon-menu.png`
    },
    pins: {
      blue: `${addon}/pin-blue.png`,
      green: `${addon}/pin-green.png`,
      black: `${addon}/pin-black.png`,
      yellow: `${addon}/pin-yellow.png`,
      red: `${addon}/pin-red.png`
    },
    badges: {
      energy: `${addon}/badge-energy.png`,
      heart: `${addon}/badge-heart.png`,
      memory: `${addon}/badge-memory.png`,
      finance: `${addon}/badge-finance.png`,
      ai: `${addon}/badge-ai.png`,
      node: `${addon}/badge-node.png`
    },
    tiles: {
      grass: `${addon}/tile-grass.png`,
      path: `${addon}/tile-path.png`,
      stone: `${addon}/tile-stone.png`,
      wood: `${addon}/tile-wood.png`,
      water: `${addon}/tile-water.png`,
      cliff: `${addon}/tile-cliff.png`
    },
    props: {
      dockSquare: `${addon}/dock-square.png`,
      bridgeWood: `${addon}/bridge-wood.png`,
      bridgeStone: `${addon}/bridge-stone.png`,
      boatMotor: `${addon}/boat-motor.png`,
      boatSail: `${addon}/boat-sail.png`,
      boatYacht: `${addon}/boat-yacht.png`,
      lighthouse: `${addon}/lighthouse.png`,
      treeGreen: `${addon}/tree-green.png`,
      treePalm: `${addon}/tree-palm.png`,
      treeWhite: `${addon}/tree-white.png`,
      reedPatch: `${addon}/reed-patch.png`,
      flowerBed: `${addon}/flower-bed.png`,
      bench: `${addon}/bench.png`,
      lampBlack: `${addon}/lamp-black.png`,
      lampGold: `${addon}/lamp-gold.png`,
      lampBlue: `${addon}/lamp-blue.png`,
      signpost: `${addon}/signpost.png`
    }
  },
  employees: [
    `${base}/char-researcher.png`,
    `${base}/char-analyst.png`,
    `${base}/char-assistant.png`,
    `${base}/char-female.png`,
    `${base}/char-male.png`,
    `${base}/char-bot.png`
  ]
} as const;
