import { transferItem } from "../../game/core/containers.js";

export function createSurvivalTaskStarters({
  now,
  playerActor,
  placedStructures,
  storageContainer,
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
  gatherActionForNode,
  isFieldNodeVisible,
  nodeWorkPoint,
  buildingWorkPoint,
  adjacentPoint,
  distanceBetween,
  t,
}) {
  function autoSuffix(source) {
    return source === "auto" || source === "station-auto" ? t("log.autoSuffix") : "";
  }

  function startActorPickupTask(actor, node, nextTask = null) {
    if (!actor || !node || actor.taskId !== null) {
      return false;
    }

    const targetPoint = nodeWorkPoint(node);
    const task = {
      id: makeId("pickup"),
      kind: "gather",
      actionId: null,
      label: `${itemName(node.itemId)}を拾う`,
      itemId: node.itemId,
      amount: 1,
      workerType: isPlayerActor(actor) ? "player" : "villager",
      villagerId: actor.id,
      station: "field",
      source: "fetch",
      ruleId: null,
      targetNodeId: node.id,
      phase: "movingToTarget",
      targetPoint,
      initialTargetDistance: distanceBetween(actor, targetPoint),
      workStartedAt: null,
      duration: 1000,
      carriedOutputs: null,
      keepOutputs: true,
      nextTask,
    };

    actor.taskId = task.id;
    gatherQueue.push(task);
    addLog(t("log.moveToPickup", { actor: actor.name, item: itemName(node.itemId) }));
    return true;
  }

  function ensureVillagerHasRequiredItem(villager, itemId) {
    if (villagerHasItem(villager, itemId)) {
      return true;
    }
    if (availableItemCount(itemId) <= 0) {
      return false;
    }

    if (placedStructures.storage) {
      if (!transferItem(storageContainer, villager, itemId, 1)) {
        return false;
      }
      addLog(t("log.takeFromStorage", { actor: villager.name, item: itemName(itemId) }));
      return true;
    }

    return false;
  }

  function prepareVillagerRequiredItem(villager, itemId, nextTask) {
    if (villagerHasItem(villager, itemId)) {
      return true;
    }

    if (placedStructures.storage && availableItemCount(itemId) > 0) {
      return ensureVillagerHasRequiredItem(villager, itemId);
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
      if (!transferItem(storageContainer, actor, itemId, 1)) {
        return false;
      }
      addLog(t("log.takeFromStorage", { actor: actor.name, item: itemName(itemId) }));
      return true;
    }

    const node = findPickupNodeByItem(itemId);
    if (node) {
      startActorPickupTask(actor, node, nextTask);
      return actor.taskId !== null;
    }

    return false;
  }

  function prepareVillagerCraftResources(villager, recipe) {
    if (!villager || !recipe) {
      return false;
    }

    if (hasActorResources(villager, recipe)) {
      return true;
    }

    if (!placedStructures.storage) {
      return false;
    }

    return Object.entries(recipe.costs || {}).every(([itemId, amount]) => {
      const heldAmount = villager.inventory[itemId] || 0;
      const missingAmount = Math.max(0, amount - heldAmount);
      if (missingAmount <= 0) {
        return true;
      }

      for (let index = 0; index < missingAmount; index += 1) {
        if (!transferItem(storageContainer, villager, itemId, 1)) {
          return false;
        }
      }

      addLog(t("log.takeFromStorage", { actor: villager.name, item: itemName(itemId) }));
      return true;
    });
  }

  function canStartGather(action) {
    return Boolean(action)
      && isGatherUnlocked(action)
      && Boolean(availableVillagerForGather(action))
      && Boolean(findGatherTargetNode(action));
  }

  function startActorGatherTask(actor, action, targetNode, options = {}) {
    if (!actor || !action || !targetNode || actor.taskId !== null) {
      return false;
    }

    const targetPoint = nodeWorkPoint(targetNode);
    const task = {
      id: makeId(isPlayerActor(actor) ? "player-gather" : "gather"),
      kind: "gather",
      actionId: action.id,
      itemId: action.itemId,
      amount: action.amount,
      workerType: isPlayerActor(actor) ? "player" : "villager",
      villagerId: actor.id,
      station: action.requiresStation || "field",
      source: options.source || "manual",
      ruleId: options.ruleId || null,
      targetNodeId: targetNode.id,
      phase: "movingToTarget",
      targetPoint,
      initialTargetDistance: distanceBetween(actor, targetPoint),
      workStartedAt: null,
      duration: action.duration,
      dropToStorage: options.dropToStorage ?? !isPlayerActor(actor),
      carriedOutputs: null,
      keepOutputs: options.keepOutputs ?? isPlayerActor(actor),
      nextTask: options.nextTask || null,
    };

    actor.taskId = task.id;
    gatherQueue.push(task);
    return true;
  }

  function startActorFieldTask(actor, nodeId, options = {}) {
    const node = fieldNodeById(nodeId);
    const action = node ? gatherActionForNode(node) : null;
    if (!actor) {
      return false;
    }
    if (actor.taskId && !findTaskById(actor.taskId)) {
      actor.taskId = null;
    }

    if (!node || !action || actor.taskId !== null) {
      return false;
    }

    const prepared = action.requiresItem
      ? prepareActorRequiredItem(actor, action.requiresItem, {
        kind: "actor-gather",
        actorId: actor.id,
        nodeId: node.id,
        options,
      })
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
    addLog(t("log.moveToAction", { actor: actor.name, action: action.label }));
    return true;
  }

  function startPlayerFieldTask(nodeId) {
    return startActorFieldTask(playerActor, nodeId, {
      source: "manual",
      keepOutputs: true,
      dropToStorage: false,
    });
  }

  function startGather(actionId, options = {}) {
    const action = gatherActionById(actionId);
    const targetNode = action ? findGatherTargetNode(action, options.targetNodeId || null) : null;
    if (!action || !targetNode || !isGatherUnlocked(action)) {
      if (action?.requiresItem) {
        addLog(t("log.itemMissingActionShort", { item: itemName(action.requiresItem), action: action.label }));
      }
      return false;
    }

    const villager = availableVillagerForGather(action);
    if (!villager) {
      addLog(t("log.noVillagerForStation", { station: stationName(action.requiresStation || "hand") }));
      return false;
    }
    if (action.requiresItem) {
      const prepared = prepareVillagerRequiredItem(villager, action.requiresItem, {
        kind: "actor-gather",
        actorId: villager.id,
        nodeId: targetNode.id,
        options: {
          source: options.source || "manual",
          ruleId: options.ruleId || null,
          dropToStorage: true,
        },
      });
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
    const started = startActorGatherTask(villager, action, targetNode, {
      source,
      ruleId: options.ruleId || null,
      dropToStorage: true,
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

    if (workerType === "self" && (recipe.station !== "hand" || options.isPlayerBusy?.value)) {
      return false;
    }

    if (workerType === "self") {
      if (!consumeActorResources(playerActor, recipe)) {
        return false;
      }
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
      craftQueue.push(task);
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

    const preparedResources = prepareVillagerCraftResources(villager, recipe);
    if (!preparedResources || !consumeActorResources(villager, recipe)) {
      return false;
    }
    const targetPoint = buildingWorkPoint(recipe.station);
    const task = {
      id: makeId("task"),
      kind: "craft",
      recipeId,
      workerType,
      villagerId: villager.id,
      station: recipe.station,
      source,
      phase: "movingToTarget",
      targetPoint,
      initialTargetDistance: distanceBetween(villager, targetPoint),
      workStartedAt: null,
      carriedOutputs: recipe.outputs,
      craftEntryId: options.craftEntryId || null,
      startedAt: now.value,
      duration: recipe.duration,
    };

    villager.taskId = task.id;
    craftQueue.push(task);
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
      if (playerActor.taskId && !findTaskById(playerActor.taskId)) {
        playerActor.taskId = null;
      }
      if (playerActor.taskId !== null) {
        return false;
      }
      if (!actorHasItem(playerActor, "hammer")) {
        addLog(t("log.itemMissingActionShort", { item: itemName("hammer"), action: t("common.build") }));
        return false;
      }

      const targetPoint = adjacentPoint(site.x, site.y, -4, 4);
      const task = {
        id: makeId("construction"),
        kind: "build",
        structureId,
        workerType: "player",
        villagerId: playerActor.id,
        station: "construction",
        phase: "movingToTarget",
        targetPoint,
        initialTargetDistance: distanceBetween(playerActor, targetPoint),
        workStartedAt: null,
        startedAt: now.value,
        duration: building.duration,
      };

      playerActor.taskId = task.id;
      constructionQueue.push(task);
      addLog(t("log.playerBuildStarted", { building: building.name }));
      return true;
    }

    const villager = availableVillagerForConstruction();
    if (!villager) {
      return false;
    }
    const prepared = prepareVillagerRequiredItem(villager, "hammer", {
      kind: "build",
      structureId,
    });
    if (!prepared) {
      return villager.taskId !== null;
    }

    const targetPoint = adjacentPoint(site.x, site.y, -4, 4);
    const task = {
      id: makeId("construction"),
      kind: "build",
      structureId,
      workerType: "villager",
      villagerId: villager.id,
      station: "construction",
      phase: "movingToTarget",
      targetPoint,
      initialTargetDistance: distanceBetween(villager, targetPoint),
      workStartedAt: null,
      startedAt: now.value,
      duration: building.duration,
    };

    villager.taskId = task.id;
    constructionQueue.push(task);
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
