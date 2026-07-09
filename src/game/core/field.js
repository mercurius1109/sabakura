export function randomFieldCoordinate(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFieldPosition() {
  return {
    x: randomFieldCoordinate(10, 90),
    y: randomFieldCoordinate(16, 84),
  };
}

export function createInitialFieldNodes(resourceConfigs, treeNodes) {
  const resourceNodes = resourceConfigs.flatMap((config) =>
    Array.from({ length: config.count }, (_, index) => {
      const position = randomFieldPosition();
      return {
        id: `${config.prefix}-${index + 1}`,
        type: config.type,
        itemId: config.itemId,
        title: config.title,
        actionLabel: config.actionLabel,
        x: position.x,
        y: position.y,
        respawnMs: config.respawnMs,
        hiddenUntil: null,
      };
    }),
  );

  return [...resourceNodes, ...treeNodes.map((node) => ({ ...node, hiddenUntil: null }))];
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

export function clampFieldPosition(value, min = 6, max = 94) {
  return Math.max(min, Math.min(max, value));
}

export function spawnDroppedLogs(fieldNodes, treeNode, offsets, makeId) {
  offsets.forEach((offset, index) => {
    fieldNodes.push({
      id: makeId(`dropped-log-${index}`),
      type: "pickup",
      itemId: "log",
      title: "丸太",
      actionLabel: "丸太を拾う",
      x: clampFieldPosition(treeNode.x + offset.x),
      y: clampFieldPosition(treeNode.y + offset.y),
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
    fieldNodes.push({
      id: makeId(`dropped-${drop.itemId}-${index}`),
      type: "pickup",
      itemId: drop.itemId,
      title: itemName(drop.itemId),
      actionLabel: `${itemName(drop.itemId)}を拾う`,
      x: clampFieldPosition(origin.x + drop.offset.x + drop.stackIndex * 1.5),
      y: clampFieldPosition(origin.y + drop.offset.y + drop.stackIndex * 1.5),
      respawnMs: 0,
      hiddenUntil: null,
      transient: true,
    });
  });
}
