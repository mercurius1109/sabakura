import { addItem, transferItem } from "../../game/core/containers.js";

export function createSurvivalTaskRuntimeHandlers({
  now,
  playerActor,
  placedStructures,
  storageContainer,
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
  spawnDroppedLogs,
  nodeWorkPoint,
  actorInventoryCount,
  gatherActionById,
  findGatherTargetNode,
  removeItemFromStore,
  consumeActorResources,
  restartVillagerTask,
  buildingById,
  removeTaskFromActiveState,
  createGatherTaskFromTemplate,
  dropOutputsAtActor,
  enqueueMoveThenTask,
  enqueueStorageTransfers,
  itemDefinitions,
  t,
}) {
  function restoreActorFullness(actor, amount) {
    if (!actor) {
      return;
    }
    actor.fullness = Math.max(0, Math.min(actor.maxFullness || 100, actor.fullness + amount));
  }

  function completeEatTask(task) {
    const actor = actorById(task.villagerId);
    const food = itemDefinitions[task.itemId];
    if (!actor || !food?.nutrition) {
      removeTaskFromActiveState(task);
      return;
    }

    if (task.itemSource === "storage") {
      const moved = transferItem(storageContainer, actor, task.itemId, 1);
      if (!moved) {
        removeTaskFromActiveState(task);
        return;
      }
    }

    if (!removeItemFromStore(actor.inventory, task.itemId, 1)) {
      removeTaskFromActiveState(task);
      return;
    }

    restoreActorFullness(actor, food.nutrition);
    addLog(t("log.actorAte", { actor: actor.name, item: itemName(task.itemId) }));
    removeTaskFromActiveState(task);
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

    dropOutputsAtActor(villager, task.carriedOutputs);
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
      }

      if (node.transient) {
        const index = fieldNodeIndexById(node.id);
        if (index >= 0) {
          fieldNodes.splice(index, 1);
        }
      } else {
        node.hiddenUntil = now.value + node.respawnMs;
      }

      const villager = actorById(task.villagerId);
      if (villager) {
        addItem(villager.inventory, task.itemId, task.amount);
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

  return {
    clearVillagerOutputs,
    completeConstructionTask,
    completeCraftTask,
    completeEatTask,
    completeGatherTask,
    completeTransferTask,
    depositVillagerOutputs,
    dropVillagerOutputsToField,
    finishTaskWork,
  };
}
