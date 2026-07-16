export function createSurvivalTaskRuntimeFactories({
  now,
  storagePoint,
  itemName,
  actorById,
  spawnDroppedItems,
  storageWorkPoint,
  actorWorkPoint,
  distanceBetween,
  storageInteractionDistance,
  actorInteractionDistance,
  scheduleActorTask,
  makeId,
  buildingById,
  t,
}) {
  function currentStorageAnchor() {
    const storageBuilding = buildingById("storage");
    return storageBuilding
      ? { x: storageBuilding.x, y: storageBuilding.y }
      : storagePoint;
  }

  function isAtPoint(actor, point) {
    return Boolean(actor && point && distanceBetween(actor, point) <= 0.0001);
  }

  function createMoveTask(actor, targetPoint, label, targetKind = "field", actorId = null) {
    return {
      id: makeId(actor?.kind === "player" ? "player-move" : "approach"),
      kind: "move",
      label,
      workerType: actor?.kind === "player" ? "player" : "villager",
      villagerId: actor?.id,
      station: targetKind,
      source: "manual",
      targetPoint,
      initialTargetDistance: distanceBetween(actor, targetPoint),
      duration: 1,
      actorId,
      targetKind,
    };
  }

  function createTransferTask(actor, itemId, amount, transferDirection, targetKind = "storage", actorId = null, source = "manual") {
    return {
      id: makeId("transfer"),
      kind: "transfer",
      label: transferDirection === "toStorage"
        ? t("log.moveToStorage", { actor: actor.name, item: itemName(itemId) })
        : t("log.takeFromStorage", { actor: actor.name, item: itemName(itemId) }),
      itemId,
      amount,
      workerType: actor?.kind === "player" ? "player" : "villager",
      villagerId: actor?.id,
      station: targetKind,
      source,
      workStartedAt: null,
      duration: 1,
      transferDirection,
      actorId,
      targetKind,
    };
  }

  function createGatherTaskFromTemplate(actor, action, node, template = {}) {
    return {
      id: makeId(actor?.kind === "player" ? "player-gather" : "gather"),
      kind: "gather",
      actionId: action.id,
      itemId: action.itemId,
      amount: action.amount,
      workerType: template.workerType || (actor?.kind === "player" ? "player" : "villager"),
      villagerId: actor?.id,
      station: template.station || "field",
      source: template.source || "manual",
      ruleId: template.ruleId || null,
      targetNodeId: node.id,
      workStartedAt: null,
      duration: action.duration,
      dropToStorage: template.dropToStorage ?? false,
      carriedOutputs: null,
      keepOutputs: template.keepOutputs ?? false,
      carryLimit: template.carryLimit ?? actor?.inventoryCapacity ?? Number.POSITIVE_INFINITY,
      deliveryTarget: template.deliveryTarget ?? action.amount,
      carriedAmount: template.carriedAmount ?? 0,
      resumeActionId: template.resumeActionId || null,
    };
  }

  function enqueueTask(actor, task) {
    if (!actor || !task) {
      return false;
    }
    return scheduleActorTask(actor, task);
  }

  function enqueueMoveThenTask(actor, targetPoint, label, nextTask, targetKind = "field", actorId = null) {
    if (isAtPoint(actor, targetPoint)) {
      return enqueueTask(actor, nextTask);
    }
    const moveTask = createMoveTask(actor, targetPoint, label, targetKind, actorId);
    const moved = enqueueTask(actor, moveTask);
    if (!moved) {
      return false;
    }
    return enqueueTask(actor, nextTask);
  }

  function enqueueStorageTransfers(actor, outputs, sourceLogKey = "log.moveCraftToStorage") {
    if (!actor || !outputs || Object.keys(outputs).length === 0) {
      return false;
    }
    const storagePointTarget = storageWorkPoint(actor);
    let queuedAny = false;
    let needsMove = !isAtPoint(actor, storagePointTarget);

    Object.entries(outputs).forEach(([itemId, amount]) => {
      const transferTask = createTransferTask(actor, itemId, amount, "toStorage", "storage", null, "deliver");
      if (!queuedAny && needsMove) {
        const moveTask = createMoveTask(
          actor,
          storagePointTarget,
          t(sourceLogKey, { actor: actor.name, item: itemName(itemId) }),
          "storage",
        );
        enqueueTask(actor, moveTask);
        needsMove = false;
      }
      enqueueTask(actor, transferTask);
      queuedAny = true;
    });

    return queuedAny;
  }

  function refreshMovingDestination(task, actor, destination, targetActor) {
    if (task.targetKind === "actor" && targetActor) {
      return actorWorkPoint(targetActor, actor);
    }

    if (task.targetKind === "storage") {
      return storageWorkPoint(actor);
    }

    return destination;
  }

  function dropOutputsAtActor(actor, outputs) {
    if (!actor || !outputs) {
      return;
    }
    spawnDroppedItems(outputs, { x: actor.x, y: actor.y });
  }

  return {
    createGatherTaskFromTemplate,
    createMoveTask,
    createTransferTask,
    currentStorageAnchor,
    dropOutputsAtActor,
    enqueueMoveThenTask,
    enqueueStorageTransfers,
    enqueueTask,
    isAtPoint,
    refreshMovingDestination,
  };
}
