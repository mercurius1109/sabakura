import { addItem, transferItem } from "../../game/core/containers.js";

export function createSurvivalTaskRuntime({
  now,
  playerActor,
  placedStructures,
  storageContainer,
  storagePoint,
  craftQueue,
  gatherQueue,
  constructionQueue,
  constructionSites,
  fieldNodes,
  addLog,
  itemName,
  recipeById,
  villagerName,
  actorById,
  fieldNodeById,
  isFieldNodeVisible,
  fieldNodeIndexById,
  actorWorkPoint,
  spawnDroppedLogs,
  spawnDroppedItems,
  nodeWorkPoint,
  storageWorkPoint,
  distanceBetween,
  actorInventoryCount,
  shouldVillagerContinue,
  gatherActionById,
  findGatherTargetNode,
  addItemToStore,
  removeItemFromStore,
  consumeActorResources,
  restartVillagerTask,
  respawnFieldNodes,
  checkStockRules,
  checkConstructionSites,
  moveActorForTask,
  actorInteractionDistance,
  buildingById,
  storageInteractionDistance,
  removeTaskFromActiveState,
  scheduleActorTask,
  makeId,
  t,
}) {
  function currentStorageAnchor() {
    const storageBuilding = buildingById("storage");
    return storageBuilding
      ? { x: storageBuilding.x, y: storageBuilding.y }
      : storagePoint;
  }

  function beginTaskWork(task) {
    task.phase = "working";
    task.workStartedAt = now.value;
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
      phase: "movingToTarget",
      targetPoint,
      initialTargetDistance: distanceBetween(actor, targetPoint),
      workStartedAt: null,
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
      phase: "working",
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
      phase: "working",
      targetPoint: null,
      initialTargetDistance: 0,
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

    Object.entries(outputs).forEach(([itemId, amount], index) => {
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

  function depositVillagerOutputs(task) {
    const villager = actorById(task.villagerId);
    if (!villager || !task.carriedOutputs) {
      return;
    }

    Object.entries(task.carriedOutputs).forEach(([itemId, amount]) => {
      transferItem(villager, storageContainer, itemId, amount);
    });
  }

  function clearVillagerOutputs(task) {
    const villager = actorById(task.villagerId);
    if (!villager || !task.carriedOutputs) {
      return;
    }

    Object.entries(task.carriedOutputs).forEach(([itemId, amount]) => {
      removeItemFromStore(villager.inventory, itemId, amount);
    });
  }

  function dropVillagerOutputsToField(task) {
    const villager = actorById(task.villagerId);
    if (!villager || !task.carriedOutputs) {
      return;
    }

    spawnDroppedItems(task.carriedOutputs, { x: villager.x, y: villager.y });
    clearVillagerOutputs(task);
  }

  function completeCraftTask(task, options = {}) {
    const recipe = recipeById(task.recipeId);
    const crafter = task.workerType === "self" ? playerActor : actorById(task.villagerId);
    if (!recipe || !crafter || !consumeActorResources(crafter, recipe)) {
      addLog(t("log.craftFailedMissingResources", { recipe: recipe?.name || t("common.craft") }));
      removeTaskFromActiveState(task);
      return;
    }

    if (task.workerType === "self") {
      Object.entries(task.carriedOutputs || {}).forEach(([itemId, amount]) => {
        addItem(playerActor.inventory, itemId, amount);
      });
      addLog(t("log.craftCompletePlayer", { recipe: recipe.name || t("common.craft") }));
    } else {
      if (!options.skipDeposit) {
        depositVillagerOutputs(task);
      }
      addLog(t("log.craftCompleteStorage", { recipe: recipe.name || t("common.craft") }));
    }

    removeTaskFromActiveState(task);

    restartVillagerTask(task);
  }

  function completeGatherTask(task, options = {}) {
    if (!options.skipDeposit) {
      depositVillagerOutputs(task);
      const deliveredAmount = Object.values(task.carriedOutputs || {}).reduce((total, amount) => total + amount, 0);
      addLog(t("log.gatherDelivered", { item: itemName(task.itemId), amount: deliveredAmount }));
    }

    removeTaskFromActiveState(task);

    restartVillagerTask(task);
  }

  function completeConstructionTask(task) {
    const building = buildingById(task.structureId);
    const siteIndex = constructionSites.findIndex((site) => site.structureId === task.structureId);
    if (siteIndex >= 0) {
      constructionSites.splice(siteIndex, 1);
    }
    placedStructures[task.structureId] = true;
    addLog(t("log.buildingComplete", { building: building?.name || t("common.build") }));

    removeTaskFromActiveState(task);
  }

  function completeTransferTask(task) {
    const actor = actorById(task.villagerId);
    if (!actor) {
      return;
    }

    const targetActor = task.actorId ? actorById(task.actorId) : null;
    let source = null;
    let target = null;

    if (task.targetKind === "actor" && targetActor) {
      if (task.transferDirection === "toActor") {
        source = actor;
        target = targetActor;
      } else if (task.transferDirection === "fromActor") {
        source = targetActor;
        target = actor;
      }
    } else if (task.transferDirection === "toStorage") {
      source = actor;
      target = storageContainer;
    } else {
      source = storageContainer;
      target = actor;
    }

    const moved = source && target
      ? transferItem(source, target, task.itemId, task.amount)
      : false;

    if (moved) {
      if (task.targetKind === "actor" && targetActor) {
        addLog(
          task.transferDirection === "toActor"
            ? `${actor.name} gave ${itemName(task.itemId)} to ${targetActor.name}.`
            : `${actor.name} took ${itemName(task.itemId)} from ${targetActor.name}.`,
        );
      } else {
        addLog(
          task.transferDirection === "toStorage"
            ? t("log.moveItemToContainer", {
              actor: actor.name,
              item: itemName(task.itemId),
              container: storageContainer.name,
            })
            : t("log.moveItemFromContainer", {
              actor: actor.name,
              item: itemName(task.itemId),
              container: storageContainer.name,
            }),
        );
      }
    } else {
      addLog(`Transfer of ${itemName(task.itemId)} failed.`);
    }

    removeTaskFromActiveState(task);
    if (moved) {
      restartVillagerTask(task);
    }
  }

  function isTransferAdjacent(task, actor, targetActor) {
    if (task.targetKind === "actor") {
      if (!targetActor) {
        return false;
      }
      return distanceBetween(actor, targetActor) <= actorInteractionDistance;
    }

    if (task.targetKind === "storage") {
      return distanceBetween(actor, currentStorageAnchor()) <= storageInteractionDistance;
    }

    return true;
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

  function finishTaskWork(task) {
    if (task.kind === "move") {
      removeTaskFromActiveState(task);
      return true;
    }

    if (task.kind === "transfer") {
      completeTransferTask(task);
      return true;
    }

    if (task.kind === "gather") {
      const node = fieldNodeById(task.targetNodeId);
      if (!node || !isFieldNodeVisible(node)) {
        return false;
      }

      if (node.type === "tree") {
        const spawnedStartIndex = fieldNodes.length;
        node.hiddenUntil = now.value + node.respawnMs;
        spawnDroppedLogs(node);
        addLog(t("log.choppedTree", { actor: villagerName(task.villagerId) }));

        const villager = actorById(task.villagerId);
        if (task.workerType === "villager" && villager && placedStructures.storage) {
          const spawnedLogs = fieldNodes.slice(spawnedStartIndex).filter((entry) =>
            entry.type === "pickup" && entry.itemId === task.itemId && entry.transient,
          );

          if (spawnedLogs.length > 0) {
            const pickupAction = gatherActionById(`pickup-${task.itemId}`) || {
              id: `pickup-${task.itemId}`,
              itemId: task.itemId,
              amount: 1,
              duration: 1000,
            };
            const nextTask = createGatherTaskFromTemplate(villager, pickupAction, spawnedLogs[0], {
              source: task.source,
              dropToStorage: true,
              keepOutputs: false,
              carryLimit: task.carryLimit,
              deliveryTarget: task.deliveryTarget,
              carriedAmount: task.carriedAmount,
              resumeActionId: task.resumeActionId || task.actionId,
            });
            enqueueMoveThenTask(
              villager,
              nodeWorkPoint(spawnedLogs[0], villager),
              t("log.moveToPickup", { actor: villager.name, item: itemName(task.itemId) }),
              nextTask,
            );
            removeTaskFromActiveState(task);
            return true;
          }
        }

        completeGatherTask(task, { skipDeposit: true });
        return true;
      } else if (node.transient) {
        const index = fieldNodeIndexById(node.id);
        if (index >= 0) {
          fieldNodes.splice(index, 1);
        }
      } else {
        node.hiddenUntil = now.value + node.respawnMs;
      }

      const villager = actorById(task.villagerId);
      if (villager) {
        villager.inventory[task.itemId] += task.amount;
      }

      task.carriedAmount = (task.carriedAmount || 0) + task.amount;
      if (task.keepOutputs) {
        task.carriedOutputs = { [task.itemId]: task.amount };
        addLog(t("log.pickedUpItem", { actor: villagerName(task.villagerId), item: itemName(task.itemId) }));
        completeGatherTask(task, { skipDeposit: true });
        return true;
      }
      if (!placedStructures.storage) {
        task.carriedOutputs = { [task.itemId]: villager?.inventory[task.itemId] || task.amount };
        dropVillagerOutputsToField(task);
        completeGatherTask(task, { skipDeposit: true });
        return true;
      }
      const villagerCarryLimit = villager?.inventoryCapacity ?? task.carryLimit ?? Number.POSITIVE_INFINITY;
      const nextAction = gatherActionById(task.actionId);
      const nextNode = nextAction ? findGatherTargetNode(nextAction, null, villager) : null;
      const canContinueSameHaul = Boolean(
        nextNode
        && actorInventoryCount(villager) < villagerCarryLimit
        && task.deliveryTarget
        && task.carriedAmount < task.deliveryTarget,
      );
      if (canContinueSameHaul) {
        const nextTask = createGatherTaskFromTemplate(villager, nextAction, nextNode, {
          source: task.source,
          ruleId: task.ruleId,
          dropToStorage: true,
          keepOutputs: false,
          carryLimit: task.carryLimit,
          deliveryTarget: task.deliveryTarget,
          carriedAmount: task.carriedAmount,
          resumeActionId: task.resumeActionId || task.actionId,
        });
        enqueueMoveThenTask(
          villager,
          nodeWorkPoint(nextNode, villager),
          t("log.moveToAction", { actor: villager.name, action: nextAction?.label || t("common.gather") }),
          nextTask,
        );
        removeTaskFromActiveState(task);
        return true;
      }
      const deliveryAmount = Math.min(task.deliveryTarget || task.carriedAmount || task.amount, villager?.inventory[task.itemId] || 0);
      task.carriedOutputs = { [task.itemId]: deliveryAmount };
      enqueueStorageTransfers(villager, task.carriedOutputs, "log.moveToStorage");
      removeTaskFromActiveState(task);
      return true;
    }

    if (task.kind === "craft") {
      if (task.workerType === "self") {
        return true;
      }

      const villager = actorById(task.villagerId);
      Object.entries(task.carriedOutputs || {}).forEach(([itemId, amount]) => {
        if (villager) {
          addItem(villager.inventory, itemId, amount);
        }
      });

      if (!placedStructures.storage) {
        dropVillagerOutputsToField(task);
        completeCraftTask(task, { skipDeposit: true });
        return true;
      }
      enqueueStorageTransfers(villager, task.carriedOutputs, "log.moveCraftToStorage");
      removeTaskFromActiveState(task);
      return true;
    }

    return true;
  }

  function processMovingTask(task, deltaMs) {
    const villager = actorById(task.villagerId);
    if (!villager) {
      return;
    }
    const targetActor = task.actorId ? actorById(task.actorId) : null;
    const currentDestination = task.phase === "movingToStorage" ? task.storagePoint : task.targetPoint;
    const destination = refreshMovingDestination(task, villager, currentDestination, targetActor);
    if (!destination) {
      return;
    }
    if (task.phase === "movingToStorage") {
      task.storagePoint = destination;
    } else {
      task.targetPoint = destination;
    }

    const arrived = moveActorForTask(villager, destination, deltaMs);
    if (!arrived) {
      return;
    }

    if (task.phase === "movingToTarget") {
      if (task.kind === "move") {
        if (!isTransferAdjacent(task, villager, targetActor)) {
          return;
        }
        finishTaskWork(task);
        return;
      }
      if (task.kind === "transfer") {
        if (!isTransferAdjacent(task, villager, targetActor)) {
          return;
        }
        completeTransferTask(task);
        return;
      }
      beginTaskWork(task);
    } else if (task.phase === "movingToStorage") {
      if (task.kind === "gather") {
        completeGatherTask(task);
      } else if (task.kind === "craft") {
        completeCraftTask(task);
      }
    }
  }

  function processWorkingTask(task) {
    if (task.kind === "transfer") {
      completeTransferTask(task);
      return;
    }

    if (!task.workStartedAt || now.value - task.workStartedAt < task.duration) {
      return;
    }

    if (task.kind === "build") {
      completeConstructionTask(task);
      return;
    }

    const finished = finishTaskWork(task);
    if (finished) {
      if (task.kind === "craft" && task.workerType === "self") {
        completeCraftTask(task);
        return;
      }
    }

    if (!finished) {
      const villager = actorById(task.villagerId);
      if (villager) {
        removeTaskFromActiveState(task);
      }
    }
  }

  function taskProgress(task) {
    if (task.phase === "movingToTarget") {
      return 0;
    }
    if (task.phase === "working") {
      const started = task.workStartedAt || now.value;
      return Math.max(0, Math.min(100, Math.floor(((now.value - started) / task.duration) * 100)));
    }
    if (task.phase === "movingToStorage") {
      return 100;
    }
    return 0;
  }

  function remainingSeconds(task) {
    if (task.phase !== "working") {
      return 0;
    }
    return Math.max(0, Math.ceil((task.duration - (now.value - task.workStartedAt)) / 1000));
  }

  function tick(deltaMs) {
    now.value += deltaMs;
    [...gatherQueue, ...craftQueue, ...constructionQueue].forEach((task) => {
      if (task.phase === "movingToTarget" || task.phase === "movingToStorage") {
        processMovingTask(task, deltaMs);
      } else if (task.phase === "working") {
        processWorkingTask(task);
      }
    });

    respawnFieldNodes();
    checkStockRules();
    checkConstructionSites();
  }

  return {
    beginTaskWork,
    completeConstructionTask,
    completeCraftTask,
    completeGatherTask,
    completeTransferTask,
    depositVillagerOutputs,
    dropVillagerOutputsToField,
    finishTaskWork,
    processMovingTask,
    processWorkingTask,
    remainingSeconds,
    taskProgress,
    tick,
  };
}
