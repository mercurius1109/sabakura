import { moveActorTowards } from "../../game/core/actors.js";
import {
  fieldNodeById as findFieldNodeById,
  fieldNodeIndexById as findFieldNodeIndexById,
  spawnDroppedItems as createDroppedItems,
  spawnDroppedLogs as createDroppedLogs,
  visibleFieldNodes as collectVisibleFieldNodes,
} from "../../game/core/field.js";
import {
  clampWorldPosition,
} from "../../game/core/world.js";

const DEFAULT_ADJACENT_OFFSET_X = 56;
const DEFAULT_ADJACENT_OFFSET_Y = 56;
const RESOURCE_ADJACENT_OFFSET_X = 44;
const RESOURCE_ADJACENT_OFFSET_Y = 44;
const TREE_ADJACENT_OFFSET_X = 60;
const TREE_ADJACENT_OFFSET_Y = 48;
const DEFAULT_INTERACTION_DISTANCE = Math.ceil(Math.hypot(DEFAULT_ADJACENT_OFFSET_X, DEFAULT_ADJACENT_OFFSET_Y));
const RESOURCE_INTERACTION_DISTANCE = Math.ceil(Math.hypot(RESOURCE_ADJACENT_OFFSET_X, RESOURCE_ADJACENT_OFFSET_Y));

export function createSurvivalFieldHelpers({
  fieldNodes,
  now,
  playerMoveSpeedPerSecond,
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

  function clampFieldPosition(point) {
    return clampWorldPosition(point);
  }

  function adjacentPoint(targetX, targetY, offsetX = -DEFAULT_ADJACENT_OFFSET_X, offsetY = DEFAULT_ADJACENT_OFFSET_Y) {
    return clampFieldPosition({
      x: targetX + offsetX,
      y: targetY + offsetY,
    });
  }

  function adjacentCandidates(targetX, targetY, offsetX = DEFAULT_ADJACENT_OFFSET_X, offsetY = DEFAULT_ADJACENT_OFFSET_Y) {
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

  function nearestAdjacentPoint(targetX, targetY, actor = null, offsetX = DEFAULT_ADJACENT_OFFSET_X, offsetY = DEFAULT_ADJACENT_OFFSET_Y) {
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
    return node.type === "tree"
      ? nearestAdjacentPoint(node.x, node.y, actor, TREE_ADJACENT_OFFSET_X, TREE_ADJACENT_OFFSET_Y)
      : nearestAdjacentPoint(node.x, node.y, actor, RESOURCE_ADJACENT_OFFSET_X, RESOURCE_ADJACENT_OFFSET_Y);
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

    return nearestAdjacentPoint(targetActor.x, targetActor.y, actor, RESOURCE_ADJACENT_OFFSET_X, RESOURCE_ADJACENT_OFFSET_Y);
  }

  function distanceBetween(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function moveActorForTask(actor, destination, deltaMs) {
    const speedPerSecond = actor?.kind === "player"
      ? playerMoveSpeedPerSecond
      : villagerMoveSpeedPerSecond;
    return moveActorTowards(actor, destination, deltaMs, speedPerSecond);
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

  function findGatherTargetNode(action, targetNodeId = null, actor = null) {
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

    const candidates = visibleFieldNodes().filter((node) => {
      if (action.id === "gather-log") {
        return node.type === "tree";
      }
      return node.type === "pickup" && node.itemId === action.itemId;
    });

    if (candidates.length === 0) {
      return null;
    }

    if (!actor) {
      return candidates[0];
    }

    return candidates.reduce((best, candidate) => {
      if (!best) {
        return candidate;
      }

      const bestPoint = nodeWorkPoint(best, actor);
      const candidatePoint = nodeWorkPoint(candidate, actor);
      return distanceBetween(actor, candidatePoint) < distanceBetween(actor, bestPoint)
        ? candidate
        : best;
    }, null);
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
    moveActorForTask,
    nearestAdjacentPoint,
    nodeWorkPoint,
    actorInteractionDistance: RESOURCE_INTERACTION_DISTANCE,
    spawnDroppedItems,
    spawnDroppedLogs,
    storageInteractionDistance: DEFAULT_INTERACTION_DISTANCE,
    storageWorkPoint,
    visibleFieldNodes,
  };
}
