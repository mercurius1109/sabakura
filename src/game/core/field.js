import {
  clampWorldPosition,
  randomWorldPosition,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./world.js";

const REFERENCE_FIELD_WIDTH = 2000;
const REFERENCE_FIELD_HEIGHT = 1200;
const REFERENCE_FIELD_AREA = REFERENCE_FIELD_WIDTH * REFERENCE_FIELD_HEIGHT;
const SCATTER_MIN_DISTANCE = 34;
const SCATTER_MIN_RADIUS = 18;
const SCATTER_MAX_RADIUS = 34;
const SCATTER_ATTEMPTS_PER_ITEM = 24;

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
        depletedIcon: config.depletedIcon || null,
        title: config.title,
        actionLabel: config.actionLabel,
        requiresItem: config.requiresItem,
        x: position.x,
        y: position.y,
        respawnMs: config.respawnMs,
        respawnInPlace: Boolean(config.respawnInPlace),
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
        depletedIcon: config.depletedIcon || null,
        title: config.title,
        actionLabel: config.actionLabel,
        requiresItem: config.requiresItem,
        x: position.x,
        y: position.y,
        respawnMs: config.respawnMs,
        respawnInPlace: Boolean(config.respawnInPlace),
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

export function displayFieldNodes(fieldNodes, now) {
  return fieldNodes.filter((node) => isFieldNodeVisible(node, now) || Boolean(node.depletedIcon));
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

function distanceBetweenPoints(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function randomScatterPosition(origin) {
  const angle = Math.random() * Math.PI * 2;
  const radius = SCATTER_MIN_RADIUS + (Math.random() * (SCATTER_MAX_RADIUS - SCATTER_MIN_RADIUS));
  return clampFieldPosition({
    x: origin.x + Math.cos(angle) * radius,
    y: origin.y + Math.sin(angle) * radius,
  });
}

function fallbackScatterPosition(origin, index, total) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1);
  return clampFieldPosition({
    x: origin.x + Math.cos(angle) * SCATTER_MAX_RADIUS,
    y: origin.y + Math.sin(angle) * SCATTER_MAX_RADIUS,
  });
}

export function spawnScatteredItems(fieldNodes, outputs, origin, makeId, itemName) {
  const drops = Object.entries(outputs).flatMap(([itemId, amount]) =>
    Array.from({ length: amount }, () => ({ itemId })),
  );
  const placedPositions = [];

  drops.forEach((drop, index) => {
    let position = null;

    for (let attempt = 0; attempt < SCATTER_ATTEMPTS_PER_ITEM; attempt += 1) {
      const candidate = randomScatterPosition(origin);
      const overlaps = placedPositions.some((placed) => distanceBetweenPoints(placed, candidate) < SCATTER_MIN_DISTANCE);
      if (!overlaps) {
        position = candidate;
        break;
      }
    }

    if (!position) {
      position = fallbackScatterPosition(origin, index, drops.length);
    }

    placedPositions.push(position);
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
