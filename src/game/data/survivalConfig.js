export const villagerNamePool = ["ハル", "ミナ", "レン", "ユイ", "ソラ", "ナツ", "カイ", "リン", "ヒナ", "リク", "アオ", "イブキ"];

export const storagePoint = { x: 79, y: 51 };

export const gatherActions = [
  { id: "pickup-log", labelKey: "action.pickupLog", itemId: "log", duration: 1200, amount: 1 },
  { id: "gather-wood", labelKey: "action.gatherWood", itemId: "wood", duration: 1200, amount: 1 },
  { id: "gather-stone", labelKey: "action.gatherStone", itemId: "stone", duration: 1400, amount: 1 },
  { id: "gather-log", labelKey: "action.gatherLog", itemId: "log", duration: 2400, amount: 2, requiresItem: "stoneAxe", requiresStation: "lumberjackHut" },
];

export const buildingDefinitions = [
  { id: "workbench", nameKey: "building.workbench", icon: "🛠", costs: { wood: 4 }, duration: 6000, x: 61, y: 44 },
  { id: "storage", nameKey: "building.storage", icon: "📦", costs: { wood: 6, stone: 2 }, duration: 7000, x: 79, y: 51 },
  { id: "lumberjackHut", nameKey: "building.lumberjackHut", icon: "🪓", costs: { wood: 8, stone: 4 }, duration: 8000, x: 39, y: 58 },
];

export const defaultTargets = {
  wood: 8,
  stone: 8,
  log: 6,
  stick: 8,
  stoneAxe: 1,
};

export const fieldTreeConfigs = [
  {
    prefix: "tree",
    type: "tree",
    itemId: "log",
    titleKey: "field.tree",
    actionLabelKey: "action.gatherLog",
    requiresItem: "stoneAxe",
    count: 12,
    respawnMs: 15000,
  },
];

export const droppedLogOffsets = [
  { x: -5, y: -1 },
  { x: 4, y: -3 },
  { x: 1, y: 4 },
];

export const playerDropPoint = { x: 50, y: 52 };

export const genericDropOffsets = [
  { x: -4, y: -2 },
  { x: 3, y: -3 },
  { x: 0, y: 4 },
  { x: 5, y: 2 },
];

export const fieldResourceConfigs = [
  { prefix: "branch", type: "pickup", itemId: "wood", titleKey: "field.branch", actionLabelKey: "action.gatherWood", count: 10, respawnMs: 9000 },
  { prefix: "stone", type: "pickup", itemId: "stone", titleKey: "field.stone", actionLabelKey: "action.gatherStone", count: 8, respawnMs: 11000 },
];
