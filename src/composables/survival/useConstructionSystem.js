import { removeItem } from "../../game/core/containers.js";
import { clampWorldPoint } from "../../game/core/world.js";

export function createConstructionSystem({
  playerActor,
  placedStructures,
  structurePositions,
  storage,
  constructionSites,
  fieldNodes,
  makeId,
  addLog,
  buildingById,
  fieldNodeIndexById,
  visibleFieldNodes,
  checkConstructionSites,
  t,
}) {
  function isStructurePlaced(structureId) {
    return Boolean(placedStructures[structureId]);
  }

  function hasConstructionSite(structureId) {
    return constructionSites.some((site) => site.structureId === structureId);
  }

  function visiblePickupNodesByItem(itemId) {
    return visibleFieldNodes().filter((node) => node.type === "pickup" && node.itemId === itemId);
  }

  function findPickupNodeByItem(itemId) {
    return visiblePickupNodesByItem(itemId)[0] || null;
  }

  function availableItemCount(itemId) {
    if (placedStructures.storage) {
      return storage[itemId] || 0;
    }
    return visiblePickupNodesByItem(itemId).length;
  }

  function hasResources(definition) {
    return Object.entries(definition.costs).every(([itemId, amount]) => availableItemCount(itemId) >= amount);
  }

  function hasActorResources(actor, definition) {
    if (!actor) {
      return false;
    }
    return Object.entries(definition.costs).every(([itemId, amount]) => (actor.inventory[itemId] || 0) >= amount);
  }

  function consumeFieldItems(itemId, amount) {
    const nodes = visiblePickupNodesByItem(itemId).slice(0, amount);
    if (nodes.length < amount) {
      return false;
    }

    nodes.forEach((node) => {
      const index = fieldNodeIndexById(node.id);
      if (index >= 0) {
        fieldNodes.splice(index, 1);
      }
    });

    return true;
  }

  function consumeAvailableResources(definition) {
    Object.entries(definition.costs).forEach(([itemId, amount]) => {
      if (placedStructures.storage) {
        storage[itemId] -= amount;
      } else {
        consumeFieldItems(itemId, amount);
      }
    });
  }

  function consumeActorResources(actor, definition) {
    if (!actor) {
      return false;
    }

    return Object.entries(definition.costs).every(([itemId, amount]) => removeItem(actor.inventory, itemId, amount));
  }

  function canPlaceStructure(structureId) {
    const building = buildingById(structureId);
    return Boolean(building)
      && !isStructurePlaced(structureId)
      && !hasConstructionSite(structureId)
      && hasActorResources(playerActor, building);
  }

  function buildingStatus(structureId) {
    if (isStructurePlaced(structureId)) {
      return t("status.actionDone");
    }
    if (hasConstructionSite(structureId)) {
      return t("status.running");
    }
    const building = buildingById(structureId);
    if (!building) {
      return t("status.invalidRecipe");
    }
    if (!hasActorResources(playerActor, building)) {
      return t("status.insufficientResources");
    }
    return t("status.actionPending");
  }

  function placeStructure(structureId, position = null) {
    const building = buildingById(structureId);
    if (!building || !canPlaceStructure(structureId)) {
      return false;
    }
    const x = clampPlacementPosition(position?.x, building.x, "x");
    const y = clampPlacementPosition(position?.y, building.y, "y");
    if (!consumeActorResources(playerActor, building)) {
      return false;
    }
    structurePositions[structureId] = { x, y };
    constructionSites.push({
      id: makeId("construction-site"),
      structureId,
      name: building.name,
      icon: building.icon,
      x,
      y,
      duration: building.duration,
      requiresItem: "hammer",
      costs: { ...building.costs },
    });
    addLog(t("log.placedBuilding", { building: building.name }));
    return true;
  }

  function clampPlacementPosition(value, fallback, axis = "x") {
    const numeric = Number(value);
    const resolved = Number.isFinite(numeric) ? numeric : fallback;
    const clamped = clampWorldPoint({ x: resolved, y: resolved });
    return axis === "y" ? clamped.y : clamped.x;
  }

  return {
    availableItemCount,
    buildingStatus,
    canPlaceStructure,
    consumeActorResources,
    consumeAvailableResources,
    consumeFieldItems,
    findPickupNodeByItem,
    hasActorResources,
    hasConstructionSite,
    hasResources,
    isStructurePlaced,
    placeStructure,
    visiblePickupNodesByItem,
  };
}
