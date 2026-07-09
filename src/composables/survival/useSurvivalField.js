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

  function nodeWorkPoint(node) {
    return adjacentPoint(node.x, node.y, node.type === "tree" ? -4 : -3, 3);
  }

  function buildingWorkPoint(structureId) {
    const building = buildingById(structureId);
    return building ? adjacentPoint(building.x, building.y, -4, 4) : adjacentPoint(storagePoint.x, storagePoint.y);
  }

  function storageWorkPoint() {
    return adjacentPoint(storagePoint.x, storagePoint.y, -4, 4);
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
        label: node.actionLabel || "木をこる",
        itemId: node.itemId || "log",
        duration: 2400,
        amount: 2,
        requiresItem: node.requiresItem || "stoneAxe",
      };
    }
    if (node.type === "pickup") {
      return gatherActionById(`gather-${node.itemId}`)
        || gatherActionById(`pickup-${node.itemId}`)
        || {
          id: `pickup-${node.itemId}`,
          label: `${itemName(node.itemId)}を拾う`,
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
    buildingWorkPoint,
    clampFieldPosition,
    distanceBetween,
    fieldNodeById,
    fieldNodeIndexById,
    findGatherTargetNode,
    gatherActionForNode,
    isFieldNodeVisible,
    moveVillagerTowards,
    nodeWorkPoint,
    spawnDroppedItems,
    spawnDroppedLogs,
    storageWorkPoint,
    visibleFieldNodes,
  };
}
