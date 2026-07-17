import { computed } from "vue";
import { clampWorldPosition } from "../../game/core/world.js";

export function createPlayerActions({
  playerActor,
  storage,
  storageContainer,
  placedStructures,
  storagePointWorld,
  buildingById,
  buildingWorkPoint,
  actorById,
  actorWorkPoint,
  storageWorkPoint,
  distanceBetween,
  storageInteractionDistance,
  actorInteractionDistance,
  cancelPlayerTaskForManualAction,
  scheduleActorTask,
  makeId,
  addLog,
  itemName,
  actorHasItem,
  transferItem,
  removeItem,
  spawnDroppedItems,
  requestFieldTransferFly,
  stationContainerById,
}) {
  const TRANSFER_TASK_DURATION_MS = 900;

  function createPlayerMoveTask(targetPoint, label, targetKind = "field", actorId = null, station = targetKind) {
    return {
      id: makeId("move"),
      kind: "move",
      label,
      workerType: "player",
      villagerId: playerActor.id,
      station,
      source: "manual",
      targetPoint,
      initialTargetDistance: distanceBetween(playerActor, targetPoint),
      duration: 1,
      actorId,
      targetKind,
    };
  }

  function scheduleMoveThenTask(targetPoint, label, nextTask, targetKind = "field", actorId = null, station = targetKind) {
    if (distanceBetween(playerActor, targetPoint) <= 0.0001) {
      return scheduleActorTask(playerActor, nextTask);
    }
    const moved = scheduleActorTask(playerActor, createPlayerMoveTask(targetPoint, label, targetKind, actorId, station));
    if (!moved) {
      return false;
    }
    return scheduleActorTask(playerActor, nextTask);
  }

  const isPlayerAdjacentToStorage = computed(() => {
    if (!placedStructures.storage) {
      return false;
    }
    const storageBuilding = buildingById("storage");
    const storageAnchor = storageBuilding
      ? { x: storageBuilding.x, y: storageBuilding.y }
      : storagePointWorld;
    return distanceBetween(playerActor, storageAnchor) <= storageInteractionDistance;
  });

  function isPlayerAdjacentToActor(actor) {
    if (!actor || actor.id === playerActor.id) {
      return false;
    }
    return distanceBetween(playerActor, actor) <= actorInteractionDistance;
  }

  function isPlayerAdjacentToStructure(structureId) {
    const targetPoint = buildingWorkPoint(structureId, playerActor);
    if (!targetPoint) {
      return false;
    }
    return distanceBetween(playerActor, targetPoint) <= 8;
  }

  function playerTransferTargetPoint(targetKind, actorId = null) {
    if (targetKind === "storage") {
      return storageWorkPoint(playerActor);
    }

    const actor = actorById(actorId);
    return actor ? actorWorkPoint(actor, playerActor) : null;
  }

  function approachTransferTarget(targetKind = "storage", actorId = null) {
    if (!playerActor) {
      return false;
    }
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }

    if (targetKind === "storage" && isPlayerAdjacentToStorage.value) {
      return true;
    }

    const targetActor = targetKind === "actor" ? actorById(actorId) : null;
    if (targetKind === "actor" && isPlayerAdjacentToActor(targetActor)) {
      return true;
    }

    const targetPoint = playerTransferTargetPoint(targetKind, actorId);
    if (!targetPoint) {
      return false;
    }

    const label = targetKind === "storage"
      ? `Move to ${storageContainer.name}`
      : `Move to ${targetActor?.name || "actor"}`;
    return scheduleActorTask(playerActor, createPlayerMoveTask(targetPoint, label, targetKind, actorId));
  }

  function approachStructureTarget(structureId) {
    if (!playerActor || !structureId) {
      return false;
    }
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }

    const building = buildingById(structureId);
    const targetPoint = buildingWorkPoint(structureId, playerActor);
    if (!building || !targetPoint) {
      return false;
    }
    if (distanceBetween(playerActor, targetPoint) <= 8) {
      return true;
    }

    return scheduleActorTask(playerActor, createPlayerMoveTask(targetPoint, `Move to ${building.name}`, "field", null, structureId));
  }

  function movePlayerTo(position) {
    if (!playerActor || !position) {
      return false;
    }
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }

    const targetPoint = clampWorldPosition({
      x: Number(position.x),
      y: Number(position.y),
    });
    if (!Number.isFinite(targetPoint.x) || !Number.isFinite(targetPoint.y)) {
      return false;
    }
    if (distanceBetween(playerActor, targetPoint) <= 8) {
      return true;
    }

    return scheduleActorTask(playerActor, createPlayerMoveTask(targetPoint, `Move to (${targetPoint.x.toFixed(0)}, ${targetPoint.y.toFixed(0)})`));
  }

  function queuePlayerTransfer(itemId, direction, actorId = null, targetKind = "storage") {
    if (!playerActor) {
      return false;
    }
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }

    const targetActor = targetKind === "actor" ? actorById(actorId) : null;
    const playerOwnsItem = actorHasItem(playerActor, itemId);
    const storageOwnsItem = (storage[itemId] || 0) > 0;
    const actorOwnsItem = targetActor ? actorHasItem(targetActor, itemId) : false;

    if ((direction === "toStorage" || direction === "toActor") && !playerOwnsItem) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    if (direction === "fromStorage" && !storageOwnsItem) {
      addLog(`${itemName(itemId)} is not in storage.`);
      return false;
    }
    if (direction === "fromActor" && !actorOwnsItem) {
      addLog(`${targetActor?.name || "Actor"} does not have ${itemName(itemId)}.`);
      return false;
    }

    const targetPoint = playerTransferTargetPoint(targetKind, actorId);
    if (!targetPoint) {
      return false;
    }

    const task = {
      id: makeId("transfer"),
      kind: "transfer",
      label: direction === "toStorage"
        ? `Store ${itemName(itemId)}`
        : direction === "fromStorage"
          ? `Take ${itemName(itemId)}`
          : direction === "toActor"
            ? `Give ${itemName(itemId)}`
            : `Take ${itemName(itemId)}`,
      itemId,
      amount: 1,
      workerType: "player",
      villagerId: playerActor.id,
      station: targetKind,
      source: "manual",
      workStartedAt: null,
      duration: TRANSFER_TASK_DURATION_MS,
      transferDirection: direction,
      actorId,
      targetKind,
    };

    const scheduled = scheduleMoveThenTask(
      targetPoint,
      task.label,
      task,
      targetKind,
      actorId,
    );
    if (!scheduled) {
      return false;
    }
    if (direction === "toStorage") {
      addLog(`${playerActor.name} is moving ${itemName(itemId)} to storage.`);
    } else if (direction === "fromStorage") {
      addLog(`${playerActor.name} is going to take ${itemName(itemId)} from storage.`);
    } else if (direction === "toActor") {
      addLog(`${playerActor.name} is bringing ${itemName(itemId)} to ${targetActor?.name || "actor"}.`);
    } else {
      addLog(`${playerActor.name} is going to take ${itemName(itemId)} from ${targetActor?.name || "actor"}.`);
    }
    return true;
  }

  function moveItemFromActorToStorage(actor, itemId, amount = 1) {
    if (!placedStructures.storage || !actor || actor.id !== playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToStorage.value) {
      addLog(`${playerActor.name} must stand next to storage to move items.`);
      return false;
    }
    if (!transferItem(playerActor, storageContainer, itemId, amount)) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    requestFieldTransferFly(itemId, { kind: "actor", actorId: playerActor.id }, { kind: "storage" }, amount);
    addLog(`${playerActor.name} moved ${itemName(itemId)} to ${storageContainer.name}.`);
    return true;
  }

  function moveItemFromStorageToActor(actor, itemId, amount = 1) {
    if (!placedStructures.storage || !actor || actor.id !== playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToStorage.value) {
      addLog(`${playerActor.name} must stand next to storage to move items.`);
      return false;
    }
    if (!transferItem(storageContainer, playerActor, itemId, amount)) {
      addLog(`${itemName(itemId)} is not in storage.`);
      return false;
    }
    requestFieldTransferFly(itemId, { kind: "storage" }, { kind: "actor", actorId: playerActor.id }, amount);
    addLog(`${playerActor.name} took ${itemName(itemId)} from ${storageContainer.name}.`);
    return true;
  }

  function moveItemFromActorToActor(sourceActor, targetActor, itemId, amount = 1) {
    if (!sourceActor || !targetActor || sourceActor.id !== playerActor.id || targetActor.id === playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToActor(targetActor)) {
      addLog(`${playerActor.name} must stand next to ${targetActor.name} to move items.`);
      return false;
    }
    if (!transferItem(playerActor, targetActor, itemId, amount)) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    requestFieldTransferFly(itemId, { kind: "actor", actorId: playerActor.id }, { kind: "actor", actorId: targetActor.id }, amount);
    addLog(`${playerActor.name} gave ${itemName(itemId)} to ${targetActor.name}.`);
    return true;
  }

  function moveItemFromOtherActorToPlayer(sourceActor, targetActor, itemId, amount = 1) {
    if (!sourceActor || !targetActor || sourceActor.id === playerActor.id || targetActor.id !== playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToActor(sourceActor)) {
      addLog(`${playerActor.name} must stand next to ${sourceActor.name} to move items.`);
      return false;
    }
    if (!transferItem(sourceActor, playerActor, itemId, amount)) {
      addLog(`${sourceActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    requestFieldTransferFly(itemId, { kind: "actor", actorId: sourceActor.id }, { kind: "actor", actorId: playerActor.id }, amount);
    addLog(`${playerActor.name} took ${itemName(itemId)} from ${sourceActor.name}.`);
    return true;
  }

  function moveItemFromActorToStation(actor, stationId, itemId, amount = 1) {
    const stationContainer = stationContainerById(stationId);
    if (!stationContainer || !actor || actor.id !== playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToStructure(stationId)) {
      addLog(`${playerActor.name} must stand next to ${stationContainer.name} to move items.`);
      return false;
    }
    if (!transferItem(playerActor, stationContainer, itemId, amount)) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    requestFieldTransferFly(
      itemId,
      { kind: "actor", actorId: playerActor.id },
      { kind: "station", stationId },
      amount,
    );
    addLog(`${playerActor.name} moved ${itemName(itemId)} to ${stationContainer.name}.`);
    return true;
  }

  function moveItemFromStationToActor(actor, stationId, itemId, amount = 1) {
    const stationContainer = stationContainerById(stationId);
    if (!stationContainer || !actor || actor.id !== playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToStructure(stationId)) {
      addLog(`${playerActor.name} must stand next to ${stationContainer.name} to move items.`);
      return false;
    }
    if (!transferItem(stationContainer, playerActor, itemId, amount)) {
      addLog(`${itemName(itemId)} is not in ${stationContainer.name}.`);
      return false;
    }
    requestFieldTransferFly(
      itemId,
      { kind: "station", stationId },
      { kind: "actor", actorId: playerActor.id },
      amount,
    );
    addLog(`${playerActor.name} took ${itemName(itemId)} from ${stationContainer.name}.`);
    return true;
  }

  function dropPlayerItem(itemId, amount = 1) {
    if (!playerActor || amount !== 1) {
      return false;
    }
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }
    if (!actorHasItem(playerActor, itemId)) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    if (!removeItem(playerActor.inventory, itemId, amount)) {
      return false;
    }

    const dropOrigin = clampWorldPosition({
      x: playerActor.x + 96,
      y: playerActor.y + 56,
    });
    spawnDroppedItems({ [itemId]: amount }, dropOrigin);
    addLog(`${playerActor.name} dropped ${itemName(itemId)}.`);
    return true;
  }

  return {
    approachStructureTarget,
    approachTransferTarget,
    dropPlayerItem,
    isPlayerAdjacentToActor,
    isPlayerAdjacentToStorage,
    isPlayerAdjacentToStructure,
    moveItemFromActorToActor,
    moveItemFromActorToStorage,
    moveItemFromActorToStation,
    moveItemFromOtherActorToPlayer,
    moveItemFromStorageToActor,
    moveItemFromStationToActor,
    movePlayerTo,
    queuePlayerTransfer,
  };
}
