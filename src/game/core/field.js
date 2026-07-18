import {
  clampWorldPosition,
  randomWorldPosition,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./world.js";

const REFERENCE_FIELD_WIDTH = 2000;
const REFERENCE_FIELD_HEIGHT = 1200;
const REFERENCE_FIELD_AREA = REFERENCE_FIELD_WIDTH * REFERENCE_FIELD_HEIGHT;

export function randomFieldPosition() {
  return randomWorldPosition();
}

function scaledResourceCount(baseCount) {
  const areaScale = (WORLD_WIDTH * WORLD_HEIGHT) / REFERENCE_FIELD_AREA;
  return Math.max(1, Math.round(baseCount * areaScale));
}

export function createInitialFieldNodes(resourceConfigs, treeNodes) {
  const resourceNodes = resourceConfigs.flatMap((config) =>
    Array.from({ length: scaledResourceCount(config.count) }, (_, index) => {
      const position = randomFieldPosition();
      return {
        id: `${config.prefix}-${index + 1}`,
        type: config.type,
        itemId: config.itemId,
        icon: config.icon,
        title: config.title,
        actionLabel: config.actionLabel,
        requiresItem: config.requiresItem,
        x: position.x,
        y: position.y,
        respawnMs: config.respawnMs,
        hiddenUntil: null,
      };
    }),
  );

  const trees = treeNodes.flatMap((config) =>
    Array.from({ length: scaledResourceCount(config.count) }, (_, index) => {
      const position = randomFieldPosition();
      return {
        id: `${config.prefix}-${index + 1}`,
        type: config.type,
        itemId: config.itemId,
        icon: config.icon,
        title: config.title,
        actionLabel: config.actionLabel,
        requiresItem: config.requiresItem,
        x: position.x,
        y: position.y,
        respawnMs: config.respawnMs,
        hiddenUntil: null,
      };
    }),
  );

  return [...resourceNodes, ...trees];
}

export function fieldNodeById(fieldNodes, nodeId) {
  return fieldNodes.find((node) => node.id === nodeId);
}

export function fieldNodeIndexById(fieldNodes, nodeId) {
  return fieldNodes.findIndex((node) => node.id === nodeId);
}

export function isFieldNodeVisible(node, now) {
  return !node.hiddenUntil || now >= node.hiddenUntil;
}

export function visibleFieldNodes(fieldNodes, now) {
  return fieldNodes.filter((node) => isFieldNodeVisible(node, now));
}

export function clampFieldPosition(point) {
  return clampWorldPosition(point);
}

export function spawnDroppedLogs(fieldNodes, treeNode, offsets, makeId) {
  offsets.forEach((offset, index) => {
    const position = clampFieldPosition({
      x: treeNode.x + offset.x,
      y: treeNode.y + offset.y,
    });

    fieldNodes.push({
      id: makeId(`dropped-log-${index}`),
      type: "pickup",
      itemId: "log",
      title: "丸太",
      actionLabel: "丸太を拾う",
      x: position.x,
      y: position.y,
      respawnMs: 0,
      hiddenUntil: null,
      transient: true,
    });
  });
}

export function spawnDroppedItems(fieldNodes, outputs, origin, offsets, makeId, itemName) {
  const drops = Object.entries(outputs).flatMap(([itemId, amount]) =>
    Array.from({ length: amount }, (_, index) => ({
      itemId,
      offset: offsets[index % offsets.length],
      stackIndex: Math.floor(index / offsets.length),
    })),
  );

  drops.forEach((drop, index) => {
    const position = clampFieldPosition({
      x: origin.x + drop.offset.x + drop.stackIndex * (drop.offset.x === 0 ? 0 : Math.sign(drop.offset.x) * 15),
      y: origin.y + drop.offset.y + drop.stackIndex * (drop.offset.y === 0 ? 0 : Math.sign(drop.offset.y) * 15),
    });

    fieldNodes.push({
      id: makeId(`dropped-${drop.itemId}-${index}`),
      type: "pickup",
      itemId: drop.itemId,
      title: itemName(drop.itemId),
      actionLabel: `${itemName(drop.itemId)}を拾う`,
      x: position.x,
      y: position.y,
      respawnMs: 0,
      hiddenUntil: null,
      transient: true,
    });
  });
}
