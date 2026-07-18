import woodBranchIcon from "../../assets/items/wood-branch.png";
import stoneIcon from "../../assets/items/stone.png";

export const itemDefinitions = {
  wood: { nameKey: "item.wood", icon: woodBranchIcon, kind: "resource", fuel: { burnDurationMs: 60000 } },
  stone: { nameKey: "item.stone", icon: stoneIcon, kind: "resource" },
  log: { nameKey: "item.log", icon: "\uD83E\uDEB5", kind: "resource" },
  wildBerry: { nameKey: "item.wildBerry", icon: "\uD83C\uDF53", kind: "food", nutrition: 18 },
  workbench: { nameKey: "item.workbench", icon: "\uD83E\uDE91", kind: "structure" },
  lumberjackHut: { nameKey: "item.lumberjackHut", icon: "\uD83C\uDFD5", kind: "structure" },
  cookingStation: { nameKey: "item.cookingStation", icon: "\uD83C\uDF73", kind: "structure" },
  storage: { nameKey: "item.storage", icon: "\uD83D\uDCE6", kind: "structure" },
  plank: { nameKey: "item.plank", icon: "\uD83E\uDEB5", kind: "material" },
  stick: { nameKey: "item.stick", icon: "\uD83E\uDEB5", kind: "material", fuel: { burnDurationMs: 12000 } },
  stoneAxe: { nameKey: "item.stoneAxe", icon: "\uD83E\uDE93", kind: "tool" },
  stonePickaxe: { nameKey: "item.stonePickaxe", icon: "\u26CF", kind: "tool" },
  hammer: { nameKey: "item.hammer", icon: "\uD83D\uDD28", kind: "tool" },
  berryJam: { nameKey: "item.berryJam", icon: "\uD83E\uDED9", kind: "food", nutrition: 45 },
};
