const woodBranchIcon = new URL("../../assets/items/wood-branch.png", import.meta.url).href;
const stoneIcon = new URL("../../assets/items/stone.png", import.meta.url).href;
const wildBerryIcon = new URL("../../assets/items/wild-berry.png", import.meta.url).href;
const logIcon = new URL("../../assets/items/log.png", import.meta.url).href;
const workbenchIcon = new URL("../../assets/items/workbench.png", import.meta.url).href;
const storageIcon = new URL("../../assets/items/storage.png", import.meta.url).href;
const lumberjackHutIcon = new URL("../../assets/items/lumberjack-hut.png", import.meta.url).href;
const cookingStationIcon = new URL("../../assets/items/cooking-station.png", import.meta.url).href;
const plankIcon = new URL("../../assets/items/plank.png", import.meta.url).href;
const stickIcon = new URL("../../assets/items/stick.png", import.meta.url).href;
const stoneAxeIcon = new URL("../../assets/items/stone-axe.png", import.meta.url).href;
const stonePickaxeIcon = new URL("../../assets/items/stone-pickaxe.png", import.meta.url).href;
const hammerIcon = new URL("../../assets/items/hammer.png", import.meta.url).href;
const berryJamIcon = new URL("../../assets/items/berry-jam.png", import.meta.url).href;

export const itemDefinitions = {
  wood: { nameKey: "item.wood", icon: woodBranchIcon, kind: "resource", stackable: true, fuel: { burnDurationMs: 60000 } },
  stone: { nameKey: "item.stone", icon: stoneIcon, kind: "resource", stackable: true },
  log: { nameKey: "item.log", icon: logIcon, kind: "resource", stackable: true },
  wildBerry: { nameKey: "item.wildBerry", icon: wildBerryIcon, kind: "food", stackable: true, nutrition: 18 },
  workbench: { nameKey: "item.workbench", icon: workbenchIcon, kind: "structure", stackable: false },
  lumberjackHut: { nameKey: "item.lumberjackHut", icon: lumberjackHutIcon, kind: "structure", stackable: false },
  cookingStation: { nameKey: "item.cookingStation", icon: cookingStationIcon, kind: "structure", stackable: false },
  storage: { nameKey: "item.storage", icon: storageIcon, kind: "structure", stackable: false },
  plank: { nameKey: "item.plank", icon: plankIcon, kind: "material", stackable: true },
  stick: { nameKey: "item.stick", icon: stickIcon, kind: "material", stackable: true, fuel: { burnDurationMs: 12000 } },
  stoneAxe: { nameKey: "item.stoneAxe", icon: stoneAxeIcon, kind: "tool", stackable: false },
  stonePickaxe: { nameKey: "item.stonePickaxe", icon: stonePickaxeIcon, kind: "tool", stackable: false },
  hammer: { nameKey: "item.hammer", icon: hammerIcon, kind: "tool", stackable: false },
  berryJam: { nameKey: "item.berryJam", icon: berryJamIcon, kind: "food", stackable: true, nutrition: 45 },
};
