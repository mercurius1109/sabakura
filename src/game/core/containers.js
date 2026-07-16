export function createItemStore() {
  return {
    wood: 0,
    stone: 0,
    log: 0,
    wildBerry: 0,
    plank: 0,
    stick: 0,
    stoneAxe: 0,
    stonePickaxe: 0,
    hammer: 0,
    berryJam: 0,
  };
}

export function createContainer({
  id,
  kind = "container",
  name = "",
  inventory = null,
} = {}) {
  return {
    id,
    kind,
    name,
    inventory: inventory || createItemStore(),
  };
}

export function resolveStore(containerOrStore) {
  if (!containerOrStore) {
    return null;
  }

  if (containerOrStore.inventory) {
    return containerOrStore.inventory;
  }

  return containerOrStore;
}

export function countItem(store, itemId) {
  const resolved = resolveStore(store);
  return resolved?.[itemId] || 0;
}

export function hasItem(store, itemId, amount = 1) {
  return countItem(store, itemId) >= amount;
}

export function addItem(store, itemId, amount = 1) {
  const resolved = resolveStore(store);
  if (!resolved) {
    return false;
  }

  resolved[itemId] = countItem(resolved, itemId) + amount;
  return true;
}

export function removeItem(store, itemId, amount = 1) {
  const resolved = resolveStore(store);
  if (!resolved) {
    return false;
  }

  if (!hasItem(store, itemId, amount)) {
    return false;
  }

  resolved[itemId] = countItem(resolved, itemId) - amount;
  return true;
}

export function transferItem(source, target, itemId, amount = 1) {
  if (!removeItem(source, itemId, amount)) {
    return false;
  }

  addItem(target, itemId, amount);
  return true;
}
