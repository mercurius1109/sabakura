import { t } from "../../i18n/index.js";

export function actorHasItem(actor, itemId) {
  return Boolean(actor && (actor.inventory[itemId] || 0) > 0);
}

export function actorInventoryCount(actor) {
  if (!actor?.inventory) {
    return 0;
  }
  return Object.values(actor.inventory).reduce((total, amount) => total + (amount || 0), 0);
}

export function actorCanTakeRequiredItem(actor, itemId, getAvailableItemCount) {
  return actorHasItem(actor, itemId) || getAvailableItemCount(itemId) > 0;
}

export function isPlayerActor(actor, playerActorId) {
  return Boolean(actor && actor.id === playerActorId);
}

export function taskPhaseLabel(task) {
  if (!task) {
    return t("taskPhase.idle");
  }
  if (task.kind === "move") {
    return t("taskPhase.movingToTarget");
  }
  return t("taskPhase.working");
}

export function taskLabel(task, { gatherActionById, recipeById, buildingById }) {
  if (!task) {
    return t("ui.noActiveTask");
  }
  if (task.kind === "move") {
    return task.label || taskPhaseLabel(task);
  }
  if (task.kind === "gather") {
    const item = task.itemId ? t(`item.${task.itemId}`) : gatherActionById(task.actionId)?.label || t("common.gather");
    return t("task.gathering", { item });
  }
  if (task.kind === "build") {
    return t("task.building", { building: buildingById(task.structureId)?.name || t("common.build") });
  }
  if (task.kind === "transfer") {
    return t("task.transferring", { item: task.itemId ? t(`item.${task.itemId}`) : t("common.item") });
  }
  if (task.kind === "craft") {
    return t("task.crafting", { recipe: recipeById(task.recipeId)?.name || t("common.craft") });
  }
  if (task.kind === "eat") {
    return t("task.eating", { item: task.itemId ? t(`item.${task.itemId}`) : t("common.item") });
  }
  if (task.label) {
    return task.label;
  }
  return t("ui.noActiveTask");
}

export function inventorySummary(actor, itemName) {
  const held = Object.entries(actor.inventory)
    .filter(([, amount]) => amount > 0)
    .map(([itemId, amount]) => `${itemName(itemId)} x${amount}`);
  return held.length > 0 ? held.join(" / ") : t("common.carryingNone");
}

export function assignedStationsSummary(actor, stationName) {
  return actor.assignedStations.length > 0
    ? actor.assignedStations.map((stationId) => stationName(stationId)).join(" / ")
    : t("common.noAssignedStations");
}
