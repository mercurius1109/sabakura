export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 2400;
export const DEFAULT_WORLD_MARGIN_PERCENT = 6;

export function percentToWorldX(percent) {
  return (percent / 100) * WORLD_WIDTH;
}

export function percentToWorldY(percent) {
  return (percent / 100) * WORLD_HEIGHT;
}

export function percentPointToWorld(point) {
  return {
    x: percentToWorldX(point.x),
    y: percentToWorldY(point.y),
  };
}

export function percentOffsetToWorld(offset) {
  return {
    x: percentToWorldX(offset.x),
    y: percentToWorldY(offset.y),
  };
}

export function worldToPercentX(value) {
  return (value / WORLD_WIDTH) * 100;
}

export function worldToPercentY(value) {
  return (value / WORLD_HEIGHT) * 100;
}

export function clampWorldX(value, minPercent = 6, maxPercent = 94) {
  const min = percentToWorldX(minPercent);
  const max = percentToWorldX(maxPercent);
  return Math.max(min, Math.min(max, value));
}

export function clampWorldY(value, minPercent = 6, maxPercent = 94) {
  const min = percentToWorldY(minPercent);
  const max = percentToWorldY(maxPercent);
  return Math.max(min, Math.min(max, value));
}

export function clampWorldPosition(point, minXPercent = 6, maxXPercent = 94, minYPercent = 6, maxYPercent = 94) {
  return {
    x: clampWorldX(point.x, minXPercent, maxXPercent),
    y: clampWorldY(point.y, minYPercent, maxYPercent),
  };
}

export function clampWorldValue(value, max, marginPercent = DEFAULT_WORLD_MARGIN_PERCENT) {
  const margin = (max * marginPercent) / 100;
  return Math.max(margin, Math.min(max - margin, Number(value)));
}

export function clampWorldPoint(point, worldWidth = WORLD_WIDTH, worldHeight = WORLD_HEIGHT, marginPercent = DEFAULT_WORLD_MARGIN_PERCENT) {
  return {
    x: clampWorldValue(point.x, worldWidth, marginPercent),
    y: clampWorldValue(point.y, worldHeight, marginPercent),
  };
}

export function randomWorldCoordinate(minPercent, maxPercent, axis = "x") {
  const min = axis === "y" ? percentToWorldY(minPercent) : percentToWorldX(minPercent);
  const max = axis === "y" ? percentToWorldY(maxPercent) : percentToWorldX(maxPercent);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomWorldPosition(minXPercent = 10, maxXPercent = 90, minYPercent = 16, maxYPercent = 84) {
  return {
    x: randomWorldCoordinate(minXPercent, maxXPercent, "x"),
    y: randomWorldCoordinate(minYPercent, maxYPercent, "y"),
  };
}
