import { moveActorTowards } from "../../game/core/actors.js";
import {
  fieldNodeById as findFieldNodeById,
  fieldNodeIndexById as findFieldNodeIndexById,
  spawnDroppedItems as createDroppedItems,
  spawnDroppedLogs as createDroppedLogs,
  visibleFieldNodes as collectVisibleFieldNodes,
} from "../../game/core/field.js";

export function createSurvivalFieldHelpers({
  fieldNodes,
  now,
  villagerMoveSpeedPerSecond,
  droppedLogOffsets,
  genericDropOffsets,
  playerDropPoint,
  storagePoint,
  makeId,
  itemName,
  gatherActionById,
  buildingById,
}) {
  function fieldNodeById(nodeId) {
    return findFieldNodeById(fieldNodes, nodeId);
  }

  function fieldNodeIndexById(nodeId) {
    return findFieldNodeIndexById(fieldNodes, nodeId);
  }

  function isFieldNodeVisible(node) {
    return !node.hiddenUntil || now.value >= node.hiddenUntil;
  }

  function visibleFieldNodes() {
    return collectVisibleFieldNodes(fieldNodes, now.value);
  }

  function clampFieldPosition(value, min = 6, max = 94) {
    return Math.max(min, Math.min(max, value));
  }

  function adjacentPoint(targetX, targetY, offsetX = -3.5, offsetY = 3.5) {
    return {
      x: clampFieldPosition(targetX + offsetX),
      y: clampFieldPosition(targetY + offsetY),
    };
  }

  function adjacentCandidates(targetX, targetY, offsetX = 3.5, offsetY = 3.5) {
    return [
      adjacentPoint(targetX, targetY, -offsetX, offsetY),
      adjacentPoint(targetX, targetY, 0, offsetY),
      adjacentPoint(targetX, targetY, offsetX, offsetY),
      adjacentPoint(targetX, targetY, -offsetX, 0),
      adjacentPoint(targetX, targetY, offsetX, 0),
      adjacentPoint(targetX, targetY, -offsetX, -offsetY),
      adjacentPoint(targetX, targetY, 0, -offsetY),
      adjacentPoint(targetX, targetY, offsetX, -offsetY),
    ];
  }

  function nearestAdjacentPoint(targetX, targetY, actor = null, offsetX = 3.5, offsetY = 3.5) {
    const candidates = adjacentCandidates(targetX, targetY, offsetX, offsetY);
    if (!actor) {
      return candidates[0];
    }

    return candidates.reduce((best, candidate) => {
      if (!best) {
        return candidate;
      }

      const bestDistance = distanceBetween(actor, best);
      const candidateDistance = distanceBetween(actor, candidate);
      return candidateDistance < bestDistance ? candidate : best;
    }, null);
  }

  function nodeWorkPoint(node, actor = null) {
    return nearestAdjacentPoint(node.x, node.y, actor, node.type === "tree" ? 4 : 3, 3);
  }

  function buildingWorkPoint(structureId, actor = null) {
    const building = buildingById(structureId);
    return building
      ? nearestAdjacentPoint(building.x, building.y, actor)
      : nearestAdjacentPoint(storagePoint.x, storagePoint.y, actor);
  }

  function storageWorkPoint(actor = null) {
    const storageBuilding = buildingById("storage");
    return storageBuilding
      ? nearestAdjacentPoint(storageBuilding.x, storageBuilding.y, actor)
      : nearestAdjacentPoint(storagePoint.x, storagePoint.y, actor);
  }

  function actorWorkPoint(targetActor, actor = null) {
    if (!targetActor) {
      return null;
    }

    return nearestAdjacentPoint(targetActor.x, targetActor.y, actor, 3, 3);
  }

  function distanceBetween(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function moveVillagerTowards(villager, destination, deltaMs) {
    return moveActorTowards(villager, destination, deltaMs, villagerMoveSpeedPerSecond);
  }

  function spawnDroppedLogs(treeNode) {
    createDroppedLogs(fieldNodes, treeNode, droppedLogOffsets, makeId);
  }

  function spawnDroppedItems(outputs, origin = playerDropPoint) {
    createDroppedItems(fieldNodes, outputs, origin, genericDropOffsets, makeId, itemName);
  }

  function gatherActionForNode(node) {
    if (node.type === "tree") {
      return {
        id: `manual-${node.id}`,
        label: node.actionLabel || t("action.gatherLog"),
        itemId: node.itemId || "log",
        duration: 2400,
        amount: 2,
        requiresItem: node.requiresItem || "stoneAxe",
      };
    }
    if (node.type === "pickup") {
      return gatherActionById(`pickup-${node.itemId}`)
        || gatherActionById(`gather-${node.itemId}`)
        || {
          id: `pickup-${node.itemId}`,
          label: t("ui.pickupItemAction", { item: itemName(node.itemId) }),
          itemId: node.itemId,
          duration: 1200,
          amount: 1,
        };
    }
    return null;
  }

  function findGatherTargetNode(action, targetNodeId = null) {
    if (targetNodeId) {
      const node = fieldNodeById(targetNodeId);
      if (!node || !isFieldNodeVisible(node)) {
        return null;
      }
      if (action.id === "gather-log") {
        return node.type === "tree" ? node : null;
      }
      return node.type === "pickup" && node.itemId === action.itemId ? node : null;
    }

    return visibleFieldNodes().find((node) => {
      if (action.id === "gather-log") {
        return node.type === "tree";
      }
      return node.type === "pickup" && node.itemId === action.itemId;
    });
  }

  return {
    adjacentPoint,
    actorWorkPoint,
    buildingWorkPoint,
    clampFieldPosition,
    distanceBetween,
    fieldNodeById,
    fieldNodeIndexById,
    findGatherTargetNode,
    gatherActionForNode,
    isFieldNodeVisible,
    moveVillagerTowards,
    nearestAdjacentPoint,
    nodeWorkPoint,
    spawnDroppedItems,
    spawnDroppedLogs,
    storageWorkPoint,
    visibleFieldNodes,
  };
}
