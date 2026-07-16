export function createSurvivalTaskStarters({
  now,
  playerActor,
  placedStructures,
  constructionSites,
  craftQueue,
  gatherQueue,
  constructionQueue,
  makeId,
  addLog,
  itemName,
  actorHasItem,
  isPlayerActor,
  availableItemCount,
  expectedStock,
  stockRuleTarget,
  findPickupNodeByItem,
  villagerHasItem,
  availableVillagerForGather,
  availableVillagerForRecipe,
  availableVillagerForConstruction,
  gatherActionById,
  findGatherTargetNode,
  isGatherUnlocked,
  recipeById,
  isRecipeUnlocked,
  hasActorResources,
  consumeActorResources,
  buildingById,
  stationName,
  stationCraftEntries,
  actorById,
  findTaskById,
  fieldNodeById,
  actorWorkPoint,
  gatherActionForNode,
  nodeWorkPoint,
  buildingWorkPoint,
  storageWorkPoint,
  distanceBetween,
  actorInventoryCount,
  actorCanWork,
  scheduleActorTask,
  t,
}) {
  function autoSuffix(source) {
    return source === "auto" || source === "station-auto" ? t("log.autoSuffix") : "";
  }

  function isAtTarget(actor, targetPoint) {
    return distanceBetween(actor, targetPoint) <= 0.0001;
  }

  function scheduleFollowUpTask(actor, nextTask = null) {
    if (!actor || !nextTask) {
      return false;
    }
    return scheduleActorTask(actor, nextTask);
  }

  function createGatherTask(actor, action, targetNode, options = {}) {
    return {
      id: makeId(isPlayerActor(actor) ? "player-gather" : "gather"),
      kind: "gather",
      actionId: action.id,
      itemId: action.itemId,
      amount: action.amount,
      workerType: isPlayerActor(actor) ? "player" : "villager",
      villagerId: actor.id,
      station: options.preferredStationId || action.requiresStation || "field",
      source: options.source || "manual",
      ruleId: options.ruleId || null,
      targetNodeId: targetNode.id,
      phase: "working",
      targetPoint: null,
      initialTargetDistance: 0,
      workStartedAt: null,
      duration: action.duration,
      dropToStorage: options.dropToStorage ?? !isPlayerActor(actor),
      carriedOutputs: null,
      keepOutputs: options.keepOutputs ?? isPlayerActor(actor),
      carryLimit: actor.inventoryCapacity ?? Number.POSITIVE_INFINITY,
      deliveryTarget: options.deliveryTarget ?? action.amount,
      carriedAmount: 0,
    };
  }

  function createCraftTask(villager, recipeId, recipe, workerType, source, options = {}) {
    return {
      id: makeId("task"),
      kind: "craft",
      recipeId,
      workerType,
      villagerId: villager.id,
      station: recipe.station,
      source,
      phase: "working",
      targetPoint: null,
      initialTargetDistance: 0,
      workStartedAt: null,
      carriedOutputs: recipe.outputs,
      craftEntryId: options.craftEntryId || null,
      startedAt: now.value,
      duration: recipe.duration,
    };
  }

  function createConstructionTask(actor, structureId, building, workerType) {
    return {
      id: makeId("construction"),
      kind: "build",
      structureId,
      workerType,
      villagerId: actor.id,
      station: "construction",
      phase: "working",
      targetPoint: null,
      initialTargetDistance: 0,
      workStartedAt: null,
      startedAt: now.value,
      duration: building.duration,
    };
  }

  function createTransferTask(actor, itemId, amount, direction, targetKind, actorId = null, source = "manual") {
    return {
      id: makeId("transfer"),
      kind: "transfer",
      label: direction === "toStorage"
        ? t("log.moveToStorage", { actor: actor.name, item: itemName(itemId) })
        : direction === "fromStorage"
          ? t("log.takeFromStorage", { actor: actor.name, item: itemName(itemId) })
          : direction === "toActor"
            ? `${actor.name} gives ${itemName(itemId)}`
            : `${actor.name} takes ${itemName(itemId)}`,
      itemId,
      amount,
      workerType: isPlayerActor(actor) ? "player" : "villager",
      villagerId: actor.id,
      station: targetKind,
      source,
      phase: "working",
      workStartedAt: null,
      duration: 1,
      transferDirection: direction,
      actorId,
      targetKind,
    };
  }

  function startActorApproachTask(actor, targetPoint, label, nextTask = null) {
    if (!actor || !targetPoint || actor.taskId !== null) {
      return false;
    }

    const task = {
      id: makeId(isPlayerActor(actor) ? "player-move" : "approach"),
      kind: "move",
      label,
      workerType: isPlayerActor(actor) ? "player" : "villager",
      villagerId: actor.id,
      station: "field",
      source: "manual",
      phase: "movingToTarget",
      targetPoint,
      initialTargetDistance: distanceBetween(actor, targetPoint),
      workStartedAt: null,
      duration: 1,
      actorId: null,
      targetKind: "field",
    };

    const started = scheduleActorTask(actor, task);
    if (started) {
      scheduleFollowUpTask(actor, nextTask);
    }
    return started;
  }

  function startActorPickupTask(actor, node, nextTask = null) {
    if (!actor || !node || actor.taskId !== null) {
      return false;
    }

    const targetPoint = nodeWorkPoint(node, actor);
    const task = createGatherTask(actor, {
      id: `pickup-${node.itemId}`,
      itemId: node.itemId,
      amount: 1,
      duration: 1000,
    }, node, { source: "fetch", keepOutputs: true });

    const started = isAtTarget(actor, targetPoint)
      ? scheduleActorTask(actor, task)
      : startActorApproachTask(actor, targetPoint, t("log.moveToPickup", { actor: actor.name, item: itemName(node.itemId) }), task);
    if (started) {
      scheduleFollowUpTask(actor, nextTask);
    }
    return started;
  }

  function startActorStorageFetchTask(actor, itemId, amount = 1, nextTask = null) {
    if (!actor || actor.taskId !== null || amount <= 0 || !placedStructures.storage) {
      return false;
    }

    const targetPoint = storageWorkPoint(actor);
    const task = createTransferTask(actor, itemId, amount, "fromStorage", "storage", null, "fetch");
    const started = isAtTarget(actor, targetPoint)
      ? scheduleActorTask(actor, task)
      : startActorApproachTask(actor, targetPoint, t("log.moveToStorage", { actor: actor.name, item: itemName(itemId) }), task);
    if (started) {
      scheduleFollowUpTask(actor, nextTask);
    }
    addLog(t("log.moveToStorage", { actor: actor.name, item: itemName(itemId) }));
    return started;
  }

  function startActorStorageDeliveryTask(actor, itemId, amount = 1, nextTask = null) {
    if (!actor || actor.taskId !== null || amount <= 0 || !placedStructures.storage) {
      return false;
    }

    const targetPoint = storageWorkPoint(actor);
    const task = createTransferTask(actor, itemId, amount, "toStorage", "storage", null, "deliver");
    const started = isAtTarget(actor, targetPoint)
      ? scheduleActorTask(actor, task)
      : startActorApproachTask(actor, targetPoint, t("log.moveToStorage", { actor: actor.name, item: itemName(itemId) }), task);
    if (started) {
      scheduleFollowUpTask(actor, nextTask);
    }
    addLog(t("log.moveToStorage", { actor: actor.name, item: itemName(itemId) }));
    return started;
  }

  function ensureVillagerHasRequiredItem(villager, itemId, nextTask = null) {
    if (villagerHasItem(villager, itemId)) {
      return true;
    }
    if (!placedStructures.storage || availableItemCount(itemId) <= 0) {
      return false;
    }
    return startActorStorageFetchTask(villager, itemId, 1, nextTask);
  }

  function prepareVillagerRequiredItem(villager, itemId, nextTask) {
    if (villagerHasItem(villager, itemId)) {
      return true;
    }

    if (placedStructures.storage && availableItemCount(itemId) > 0) {
      return ensureVillagerHasRequiredItem(villager, itemId, nextTask)
        || villager.taskId !== null;
    }

    const node = findPickupNodeByItem(itemId);
    if (node) {
      startActorPickupTask(villager, node, nextTask);
    }

    return false;
  }

  function prepareActorRequiredItem(actor, itemId, nextTask = null) {
    if (!actor) {
      return false;
    }
    if (actorHasItem(actor, itemId)) {
      return true;
    }

    if (placedStructures.storage && availableItemCount(itemId) > 0) {
      startActorStorageFetchTask(actor, itemId, 1, nextTask);
      return actor.taskId !== null;
    }

    const node = findPickupNodeByItem(itemId);
    if (node) {
      startActorPickupTask(actor, node, nextTask);
      return actor.taskId !== null;
    }

    return false;
  }

  function prepareVillagerCraftResources(villager, recipe, source, craftEntryId = null) {
    if (!villager || !recipe) {
      return false;
    }

    if (hasActorResources(villager, recipe)) {
      return true;
    }

    if (!placedStructures.storage) {
      return false;
    }

    const missingEntry = Object.entries(recipe.costs || {}).find(([itemId, amount]) => {
      const heldAmount = villager.inventory[itemId] || 0;
      return Math.max(0, amount - heldAmount) > 0;
    });

    if (!missingEntry) {
      return true;
    }

    const [itemId, amount] = missingEntry;
    const heldAmount = villager.inventory[itemId] || 0;
    const missingAmount = Math.max(0, amount - heldAmount);
    if (availableItemCount(itemId) < missingAmount) {
      return false;
    }

    startActorStorageFetchTask(
      villager,
      itemId,
      missingAmount,
      createCraftTask(villager, recipe.id, recipe, "villager", source, { craftEntryId }),
    );
    return villager.taskId !== null;
  }

  function canStartGather(action) {
    const villager = availableVillagerForGather(action);
    return Boolean(action)
      && isGatherUnlocked(action)
      && Boolean(villager)
      && Boolean(findGatherTargetNode(action, null, villager));
  }

  function startActorGatherTask(actor, action, targetNode, options = {}) {
    if (!actor || !action || !targetNode || actor.taskId !== null) {
      return false;
    }

    const task = createGatherTask(actor, action, targetNode, options);
    const targetPoint = nodeWorkPoint(targetNode, actor);
    const started = isAtTarget(actor, targetPoint)
      ? scheduleActorTask(actor, task)
      : startActorApproachTask(actor, targetPoint, t("log.moveToAction", { actor: actor.name, action: action.label }), task);
    if (started) {
      scheduleFollowUpTask(actor, options.nextTask);
    }
    return started;
  }

  function startActorFieldTask(actor, nodeId, options = {}) {
    const node = fieldNodeById(nodeId);
    const action = node ? gatherActionForNode(node) : null;
    if (!actor) {
      return false;
    }
    if (actor.currentTaskId && !findTaskById(actor.currentTaskId)) {
      actor.taskId = null;
      actor.currentTaskId = null;
    }

    if (!node || !action || actor.taskId !== null) {
      return false;
    }

    const prepared = action.requiresItem
      ? prepareActorRequiredItem(actor, action.requiresItem, createGatherTask(actor, action, node, options))
      : true;
    if (!prepared) {
      const heldCount = actor.inventory[action.requiresItem] || 0;
      addLog(t("log.itemMissingAction", {
        item: itemName(action.requiresItem),
        action: action.label,
        actor: actor.name,
        count: heldCount,
      }));
      return false;
    }

    if (actor.taskId !== null) {
      return true;
    }

    const started = startActorGatherTask(actor, action, node, options);
    if (!started) {
      return false;
    }
    return true;
  }

  function startPlayerFieldTask(nodeId) {
    if (!actorCanWork(playerActor)) {
      addLog(t("log.tooHungryToWork", { actor: playerActor.name }));
      return false;
    }
    const node = fieldNodeById(nodeId);
    const action = node ? gatherActionForNode(node) : null;
    if (!node || !action) {
      return false;
    }

    if (action.requiresItem && !actorHasItem(playerActor, action.requiresItem)) {
      return startActorFieldTask(playerActor, nodeId, {
        source: "manual",
        keepOutputs: true,
        dropToStorage: false,
      });
    }

    const targetPoint = nodeWorkPoint(node, playerActor);
    const nextTask = createGatherTask(playerActor, action, node, {
      source: "manual",
      keepOutputs: true,
      dropToStorage: false,
      suppressMoveLog: true,
    });

    const started = isAtTarget(playerActor, targetPoint)
      ? scheduleActorTask(playerActor, nextTask)
      : startActorApproachTask(
        playerActor,
        targetPoint,
        t("log.moveToAction", { actor: playerActor.name, action: action.label }),
        nextTask,
      );
    if (!started) {
      return false;
    }

    return true;
  }

  function startGather(actionId, options = {}) {
    const action = gatherActionById(actionId);
    if (!action || !isGatherUnlocked(action)) {
      if (action?.requiresItem) {
        addLog(t("log.itemMissingActionShort", { item: itemName(action.requiresItem), action: action.label }));
      }
      return false;
    }

    const preferredStationId = options.preferredStationId || action.requiresStation || null;
    const villager = availableVillagerForGather(action, preferredStationId);
    if (!villager) {
      addLog(t("log.noVillagerForStation", { station: stationName(preferredStationId || "hand") }));
      return false;
    }
    const targetNode = findGatherTargetNode(action, options.targetNodeId || null, villager);
    if (!targetNode) {
      if (action?.requiresItem) {
        addLog(t("log.itemMissingActionShort", { item: itemName(action.requiresItem), action: action.label }));
      }
      return false;
    }
    if (action.requiresItem) {
      const prepared = prepareVillagerRequiredItem(
        villager,
        action.requiresItem,
        createGatherTask(villager, action, targetNode, {
          source: options.source || "manual",
          ruleId: options.ruleId || null,
          dropToStorage: true,
          preferredStationId,
        }),
      );
      if (!prepared) {
        if (villager.taskId) {
          return true;
        }
        addLog(t("log.villagerCannotStart", {
          actor: villager.name,
          item: itemName(action.requiresItem),
          action: action.label,
        }));
        return false;
      }
    }

    const source = options.source || "manual";
    const shortageAmount = options.ruleId
      ? Math.max(0, stockRuleTarget(options.ruleId) - expectedStock(action.itemId))
      : action.amount;
    const villagerHeldAmount = villager.inventory[action.itemId] || 0;
    if (shortageAmount > 0 && villagerHeldAmount >= shortageAmount) {
      return startActorStorageDeliveryTask(villager, action.itemId, shortageAmount);
    }
    const villagerCapacity = villager.inventoryCapacity ?? Number.POSITIVE_INFINITY;
    const capacityRemaining = Math.max(0, villagerCapacity - actorInventoryCount(villager));
    const deliveryTarget = villagerHeldAmount + Math.min(shortageAmount, capacityRemaining);
    const started = startActorGatherTask(villager, action, targetNode, {
      source,
      ruleId: options.ruleId || null,
      dropToStorage: true,
      preferredStationId,
      deliveryTarget: Math.max(1, deliveryTarget),
    });
    if (started) {
      addLog(t("log.gatherStarted", {
        actor: villager.name,
        action: action.label,
        suffix: autoSuffix(source),
      }));
      return true;
    }
    return false;
  }

  function startCraft(recipeId, options = {}) {
    const recipe = recipeById(recipeId);
    const source = options.source || "manual";
    const workerType = options.workerType || "self";
    const canPayCosts = workerType === "self"
      ? hasActorResources(playerActor, recipe || { costs: {} })
      : true;
    if (!recipe || !isRecipeUnlocked(recipe) || !canPayCosts) {
      return false;
    }

    if (workerType === "self" && (!actorCanWork(playerActor) || recipe.station !== "hand" || options.isPlayerBusy?.value)) {
      if (!actorCanWork(playerActor)) {
        addLog(t("log.tooHungryToWork", { actor: playerActor.name }));
      }
      return false;
    }

    if (workerType === "self") {
      const task = {
        id: makeId("task"),
        kind: "craft",
        recipeId,
        workerType,
        villagerId: null,
        station: recipe.station,
        source,
        phase: "working",
        workStartedAt: now.value,
        carriedOutputs: recipe.outputs,
        craftEntryId: options.craftEntryId || null,
        startedAt: now.value,
        duration: recipe.duration,
      };
      scheduleActorTask(playerActor, task);
      addLog(t("log.playerCraftStarted", { recipe: recipe.name }));
      return true;
    }

    const villager = availableVillagerForRecipe(recipe);
    if (!villager) {
      if (source === "manual" || source === "station-auto") {
        addLog(t("log.noVillagerForStation", { station: stationName(recipe.station) }));
      }
      return false;
    }

    const preparedResources = prepareVillagerCraftResources(
      villager,
      recipe,
      source,
      options.craftEntryId || null,
    );
    if (!preparedResources) {
      return false;
    }
    if (villager.taskId !== null) {
      return true;
    }
    const task = createCraftTask(villager, recipeId, recipe, workerType, source, options);
    const targetPoint = buildingWorkPoint(recipe.station, villager);
    const started = isAtTarget(villager, targetPoint)
      ? scheduleActorTask(villager, task)
      : startActorApproachTask(villager, targetPoint, t("log.villagerCraftStarted", {
        actor: villager.name,
        recipe: recipe.name,
        suffix: autoSuffix(source),
      }), task);
    if (!started) {
      return false;
    }
    addLog(t("log.villagerCraftStarted", {
      actor: villager.name,
      recipe: recipe.name,
      suffix: autoSuffix(source),
    }));
    return true;
  }

  function startPlayerCraft(recipeId, isPlayerBusy) {
    return startCraft(recipeId, { workerType: "self", isPlayerBusy });
  }

  function startStationCraftEntry(stationId, craftEntryId) {
    const entry = stationCraftEntries(stationId).find((item) => item.id === craftEntryId);
    if (!entry) {
      return false;
    }
    return startCraft(entry.recipeId, { workerType: "villager", source: "station-auto", craftEntryId });
  }

  function startConstruction(structureId, options = {}) {
    const building = buildingById(structureId);
    const site = constructionSites.find((entry) => entry.structureId === structureId);
    if (!building || !site || constructionQueue.some((task) => task.structureId === structureId)) {
      return false;
    }

    const workerType = options.workerType || "villager";
    if (workerType === "player") {
      if (!actorCanWork(playerActor)) {
        addLog(t("log.tooHungryToWork", { actor: playerActor.name }));
        return false;
      }
      if (playerActor.currentTaskId && !findTaskById(playerActor.currentTaskId)) {
        playerActor.taskId = null;
        playerActor.currentTaskId = null;
      }
      if (playerActor.taskId !== null) {
        return false;
      }
      if (!actorHasItem(playerActor, "hammer")) {
        const prepared = prepareActorRequiredItem(
          playerActor,
          "hammer",
          createConstructionTask(playerActor, structureId, building, "player"),
        );
        if (prepared && playerActor.taskId !== null) {
          return true;
        }
        addLog(t("log.itemMissingActionShort", { item: itemName("hammer"), action: t("common.build") }));
        return false;
      }

      const task = createConstructionTask(playerActor, structureId, building, "player");
      const targetPoint = buildingWorkPoint(structureId, playerActor);
      const started = isAtTarget(playerActor, targetPoint)
        ? scheduleActorTask(playerActor, task)
        : startActorApproachTask(playerActor, targetPoint, t("log.playerBuildStarted", { building: building.name }), task);
      if (!started) {
        return false;
      }
      addLog(t("log.playerBuildStarted", { building: building.name }));
      return true;
    }

    const villager = availableVillagerForConstruction();
    if (!villager) {
      return false;
    }
    const prepared = prepareVillagerRequiredItem(
      villager,
      "hammer",
      createConstructionTask(villager, structureId, building, "villager"),
    );
    if (!prepared) {
      return villager.taskId !== null;
    }
    if (villager.taskId !== null) {
      return true;
    }

    const task = createConstructionTask(villager, structureId, building, "villager");
    const targetPoint = buildingWorkPoint(structureId, villager);
    const started = isAtTarget(villager, targetPoint)
      ? scheduleActorTask(villager, task)
      : startActorApproachTask(villager, targetPoint, t("log.villagerBuildStarted", { actor: villager.name, building: building.name }), task);
    if (!started) {
      return false;
    }
    addLog(t("log.villagerBuildStarted", { actor: villager.name, building: building.name }));
    return true;
  }

  function startPlayerConstruction(structureId) {
    return startConstruction(structureId, { workerType: "player" });
  }

  return {
    canStartGather,
    prepareActorRequiredItem,
    prepareVillagerRequiredItem,
    startActorFieldTask,
    startActorGatherTask,
    startActorApproachTask,
    startActorPickupTask,
    startConstruction,
    startCraft,
    startGather,
    startPlayerConstruction,
    startPlayerCraft,
    startPlayerFieldTask,
    startStationCraftEntry,
  };
}
