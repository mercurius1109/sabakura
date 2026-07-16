import { reactive } from "vue";
import { createItemStore } from "./containers.js";

export const defaultActorMoveSpeedPerSecond = 8;

export function createActor({
  id,
  kind = "villager",
  name,
  x,
  y,
  prevX = x,
  prevY = y,
  renderX = x,
  renderY = y,
  taskId = null,
  currentTaskId = taskId,
  taskQueue = [],
  assignedStations = [],
  inventory = null,
  inventoryCapacity = kind === "player" ? Number.POSITIVE_INFINITY : 10,
  maxFullness = 100,
  fullness = maxFullness,
  speechText = "",
  speechUntil = 0,
}) {
  return {
    id,
    kind,
    name,
    taskId,
    currentTaskId,
    taskQueue: reactive([...taskQueue]),
    assignedStations: [...assignedStations],
    x,
    y,
    prevX,
    prevY,
    renderX,
    renderY,
    inventoryCapacity,
    inventory: inventory || reactive(createItemStore()),
    maxFullness,
    fullness,
    speechText,
    speechUntil,
  };
}

export function moveActorTowards(actor, destination, deltaMs, speedPerSecond = defaultActorMoveSpeedPerSecond) {
  const dx = actor.x - destination.x;
  const dy = actor.y - destination.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= 0.0001) {
    actor.x = destination.x;
    actor.y = destination.y;
    return true;
  }

  const maxStep = (speedPerSecond * deltaMs) / 1000;
  if (distance <= maxStep) {
    actor.x = destination.x;
    actor.y = destination.y;
    return true;
  }

  const ratio = maxStep / distance;
  actor.x += (destination.x - actor.x) * ratio;
  actor.y += (destination.y - actor.y) * ratio;
  return false;
}
