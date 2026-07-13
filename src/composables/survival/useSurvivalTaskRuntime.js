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
  restartVillagerTask,
  respawnFieldNodes,
  checkStockRules,
  checkConstructionSites,
  moveVillagerTowards,
  buildingById,
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
    if (task.workerType === "self") {
      Object.entries(task.carriedOutputs || {}).forEach(([itemId, amount]) => {
        addItem(playerActor.inventory, itemId, amount);
      });
      addLog(t("log.craftCompletePlayer", { recipe: recipeById(task.recipeId)?.name || t("common.craft") }));
    } else {
      if (!options.skipDeposit) {
        depositVillagerOutputs(task);
      }
      addLog(t("log.craftCompleteStorage", { recipe: recipeById(task.recipeId)?.name || t("common.craft") }));
    }

    if (task.villagerId) {
      const villager = actorById(task.villagerId);
      if (villager) {
        villager.taskId = null;
      }
    }

    const index = craftQueue.findIndex((entry) => entry.id === task.id);
    if (index >= 0) {
      craftQueue.splice(index, 1);
    }

    restartVillagerTask(task);
  }

  function completeGatherTask(task, options = {}) {
    if (!options.skipDeposit) {
      depositVillagerOutputs(task);
      const deliveredAmount = Object.values(task.carriedOutputs || {}).reduce((total, amount) => total + amount, 0);
      addLog(t("log.gatherDelivered", { item: itemName(task.itemId), amount: deliveredAmount }));
    }

    if (task.villagerId) {
      const villager = actorById(task.villagerId);
      if (villager) {
        villager.taskId = null;
      }
    }

    const index = gatherQueue.findIndex((entry) => entry.id === task.id);
    if (index >= 0) {
      gatherQueue.splice(index, 1);
    }

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

    if (task.villagerId) {
      const villager = actorById(task.villagerId);
      if (villager) {
        villager.taskId = null;
      }
    }

    const index = constructionQueue.findIndex((entry) => entry.id === task.id);
    if (index >= 0) {
      constructionQueue.splice(index, 1);
    }
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

    actor.taskId = null;
    const index = gatherQueue.findIndex((entry) => entry.id === task.id);
    if (index >= 0) {
      gatherQueue.splice(index, 1);
    }
    if (moved) {
      restartVillagerTask(task);
    }
  }

  function isTransferAdjacent(task, actor, targetActor) {
    if (task.targetKind === "actor") {
      if (!targetActor) {
        return false;
      }
      return distanceBetween(actor, targetActor) <= 5.5;
    }

    if (task.targetKind === "storage") {
      return distanceBetween(actor, currentStorageAnchor()) <= 6.5;
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
    if (task.kind === "approach") {
      const actor = actorById(task.villagerId);
      if (actor) {
        actor.taskId = null;
      }
      const index = gatherQueue.findIndex((entry) => entry.id === task.id);
      if (index >= 0) {
        gatherQueue.splice(index, 1);
      }
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
            task.resumeActionId = task.resumeActionId || task.actionId;
            task.actionId = `pickup-${task.itemId}`;
            task.amount = 1;
            task.targetNodeId = spawnedLogs[0].id;
            task.targetPoint = nodeWorkPoint(spawnedLogs[0], villager);
            task.initialTargetDistance = distanceBetween(villager, task.targetPoint);
            task.phase = "movingToTarget";
            task.workStartedAt = null;
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
      const nextNode = nextAction ? findGatherTargetNode(nextAction) : null;
      const canContinueSameHaul = Boolean(
        nextNode
        && actorInventoryCount(villager) < villagerCarryLimit
        && task.deliveryTarget
        && task.carriedAmount < task.deliveryTarget,
      );
      if (canContinueSameHaul) {
        task.phase = "movingToTarget";
        task.targetNodeId = nextNode.id;
        task.targetPoint = nodeWorkPoint(nextNode, villager);
        task.initialTargetDistance = distanceBetween(villager, task.targetPoint);
        task.workStartedAt = null;
        return true;
      }
      const deliveryAmount = Math.min(task.deliveryTarget || task.carriedAmount || task.amount, villager?.inventory[task.itemId] || 0);
      task.carriedOutputs = { [task.itemId]: deliveryAmount };
      task.phase = "movingToStorage";
      task.storagePoint = storageWorkPoint(villager);
      task.initialStorageDistance = distanceBetween(villager || currentStorageAnchor(), task.storagePoint);
      addLog(t("log.moveToStorage", { actor: villagerName(task.villagerId), item: itemName(task.itemId) }));
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
      task.phase = "movingToStorage";
      task.storagePoint = storageWorkPoint(villager);
      task.initialStorageDistance = distanceBetween(villager || currentStorageAnchor(), task.storagePoint);
      addLog(t("log.moveCraftToStorage", {
        actor: villagerName(task.villagerId),
        item: recipeById(task.recipeId)?.name || t("common.craft"),
      }));
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

    const arrived = moveVillagerTowards(villager, destination, deltaMs);
    if (!arrived) {
      return;
    }

    if (task.phase === "movingToTarget") {
      if (task.kind === "approach") {
        if (!isTransferAdjacent(task, villager, targetActor)) {
          return;
        }
        beginTaskWork(task);
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
      if (task.kind === "transfer") {
        return;
      }
    }

    if (!finished) {
      const villager = actorById(task.villagerId);
      if (villager) {
        villager.taskId = null;
      }
      if (task.kind === "gather") {
        const index = gatherQueue.findIndex((entry) => entry.id === task.id);
        if (index >= 0) {
          gatherQueue.splice(index, 1);
        }
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
