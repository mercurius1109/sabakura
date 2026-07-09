export function createSurvivalManagementHelpers({
  stations,
  recipes,
  placedStructures,
  storage,
  villagers,
  playerActor,
  stockRules,
  stationAssignments,
  craftQueue,
  gatherQueue,
  constructionQueue,
  villagerNamePool,
  makeId,
  addLog,
  createActor,
  stationById,
  buildingById,
  gatherActionById,
  itemName,
  actorHasItem,
  isPlayerActorCore,
  canActorTakeRequiredItem,
  hasActorResources,
  hasResources,
  availableItemCount,
  expectedStock,
  buildTaskLabel,
  taskPhaseLabel,
  inventorySummary,
  assignedStationsSummary,
  checkStockRules,
  checkConstructionSites,
  t,
}) {
  function stationName(stationId) {
    if (stationId === "hand") {
      return t("common.handCraft");
    }
    return stationById(stationId)?.name || t("common.facility");
  }

  function stationAssignment(stationId) {
    return stationAssignments[stationId];
  }

  function stationRecipes(stationId) {
    return recipes.filter((recipe) => recipe.station === stationId);
  }

  function stationCraftEntries(stationId) {
    return stationAssignment(stationId)?.craftEntries || [];
  }

  function stationTasks(stationId) {
    return [...craftQueue, ...gatherQueue].filter((task) => task.station === stationId);
  }

  function isStationAvailable(stationId) {
    return Boolean(placedStructures[stationId]);
  }

  function assignedVillagerIds(stationId) {
    return stationAssignment(stationId)?.villagerIds || [];
  }

  function assignedVillagerCount(stationId) {
    return assignedVillagerIds(stationId).length;
  }

  function assignedVillagerList(stationId) {
    return assignedVillagerIds(stationId)
      .map((villagerId) => villagers.find((entry) => entry.id === villagerId))
      .filter(Boolean);
  }

  function unassignedVillagersForStation(stationId) {
    return villagers.filter((villager) => !assignedVillagerIds(stationId).includes(villager.id));
  }

  function hasFacility(facilityId) {
    if (Object.prototype.hasOwnProperty.call(placedStructures, facilityId)) {
      return placedStructures[facilityId];
    }
    return (storage[facilityId] || 0) > 0;
  }

  function isRecipeUnlocked(recipe) {
    return !recipe.requiresFacility || hasFacility(recipe.requiresFacility);
  }

  function villagerHasItem(villager, itemId) {
    return actorHasItem(villager, itemId);
  }

  function isPlayerActor(actor) {
    return isPlayerActorCore(actor, playerActor.id);
  }

  function villagerCanTakeFromStorage(villager, itemId) {
    return villagerHasItem(villager, itemId) || availableItemCount(itemId) > 0;
  }

  function actorCanTakeRequiredItem(actor, itemId) {
    return canActorTakeRequiredItem(actor, itemId, availableItemCount);
  }

  function availableVillagerForStation(stationId) {
    return villagers.find((villager) => villager.taskId === null && assignedVillagerIds(stationId).includes(villager.id));
  }

  function stationHasPendingCraftWork(stationId) {
    return stationCraftEntries(stationId).some((entry) => {
      const recipe = recipeById(entry.recipeId);
      if (!entry || !recipe || entry.target <= 0 || !isStationAvailable(stationId) || !isRecipeUnlocked(recipe)) {
        return false;
      }

      const itemId = Object.keys(recipe.outputs)[0];
      return expectedStock(itemId) < entry.target;
    });
  }

  function stationHasPendingGatherWork(stationId) {
    return stockRules.some((rule) => {
      if (!rule.enabled || expectedStock(rule.itemId) >= rule.target) {
        return false;
      }

      const action = gatherActionById(rule.actionId);
      return Boolean(action) && action.requiresStation === stationId;
    });
  }

  function villagerReservedForAssignedStation(villager) {
    return villager.assignedStations.some((stationId) =>
      stationHasPendingCraftWork(stationId) || stationHasPendingGatherWork(stationId),
    );
  }

  function firstAvailableVillager(candidates, action = null) {
    return candidates.find((villager) => {
      if (villager.taskId !== null) {
        return false;
      }
      if (!action?.requiresItem) {
        return true;
      }
      return villagerCanTakeFromStorage(villager, action.requiresItem);
    }) || null;
  }

  function availableVillagerForGather(action = null) {
    const candidates = action?.requiresStation
      ? villagers.filter((villager) => assignedVillagerIds(action.requiresStation).includes(villager.id))
      : villagers;

    if (action?.requiresStation) {
      return firstAvailableVillager(candidates, action);
    }

    const preferredCandidates = candidates.filter((villager) => !villagerReservedForAssignedStation(villager));
    return firstAvailableVillager(preferredCandidates, action);
  }

  function availableVillagerForRecipe(recipe) {
    if (recipe.station === "hand") {
      return null;
    }
    return villagers.find((villager) =>
      villager.taskId === null
      && assignedVillagerIds(recipe.station).includes(villager.id)
    );
  }

  function availableVillagerForConstruction() {
    const preferredCandidates = villagers.filter((villager) => !villagerReservedForAssignedStation(villager));
    return firstAvailableVillager(preferredCandidates, { requiresItem: "hammer" })
      || firstAvailableVillager(villagers, { requiresItem: "hammer" });
  }

  function villagerName(villagerId) {
    const villager = villagerId === playerActor.id
      ? playerActor
      : villagers.find((entry) => entry.id === villagerId);
    return villager ? villager.name : t("ui.villager");
  }

  function actorById(actorId) {
    if (actorId === playerActor.id) {
      return playerActor;
    }
    return villagers.find((entry) => entry.id === actorId) || null;
  }

  function findTaskById(taskId) {
    return craftQueue.find((task) => task.id === taskId)
      || gatherQueue.find((task) => task.id === taskId)
      || constructionQueue.find((task) => task.id === taskId);
  }

  function taskLabel(task) {
    return buildTaskLabel(task, { gatherActionById, recipeById, buildingById });
  }

  function recipeById(recipeId) {
    return recipes.find((recipe) => recipe.id === recipeId);
  }

  function villagerInventorySummary(villager) {
    return inventorySummary(villager, itemName);
  }

  function villagerAssignedStationsSummary(villager) {
    return assignedStationsSummary(villager, stationName);
  }

  function villagerNote(villager) {
    const task = findTaskById(villager.taskId);
    const inventoryText = `持ち物: ${villagerInventorySummary(villager)}`;
    const stationText = `${t("ui.assignedStations")}: ${villagerAssignedStationsSummary(villager)}`;
    if (!task) {
      return `${stationText} / ${t("taskPhase.idle")} / ${inventoryText}`;
    }
    return `${taskLabel(task)} / ${taskPhaseLabel(task)} / ${stationText} / ${inventoryText}`;
  }

  function addVillagerToStation(villagerId, stationId) {
    const station = stationAssignment(stationId);
    const villager = villagers.find((entry) => entry.id === villagerId);
    if (!station || !villager || !isStationAvailable(stationId)) {
      return;
    }
    if (!station.villagerIds.includes(villagerId)) {
      station.villagerIds.push(villagerId);
    }
    if (!villager.assignedStations.includes(stationId)) {
      villager.assignedStations.push(stationId);
    }
    addLog(t("log.assignedStation", { actor: villager.name, station: stationName(stationId) }));
    checkStockRules();
  }

  function removeVillagerFromStation(villagerId, stationId) {
    const station = stationAssignment(stationId);
    const villager = villagers.find((entry) => entry.id === villagerId);
    if (!station || !villager) {
      return;
    }
    const stationIndex = station.villagerIds.indexOf(villagerId);
    if (stationIndex >= 0) {
      station.villagerIds.splice(stationIndex, 1);
    }
    const villagerIndex = villager.assignedStations.indexOf(stationId);
    if (villagerIndex >= 0) {
      villager.assignedStations.splice(villagerIndex, 1);
    }
    addLog(t("log.unassignedStation", { actor: villager.name, station: stationName(stationId) }));
  }

  function generateVillagerName() {
    const usedNames = new Set(villagers.map((villager) => villager.name));
    const baseName = villagerNamePool.find((name) => !usedNames.has(name))
      || villagerNamePool[Math.floor(Math.random() * villagerNamePool.length)];
    let suffix = 2;
    let candidate = baseName;
    while (usedNames.has(candidate)) {
      candidate = `${baseName}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function addVillager() {
    const index = villagers.length;
    const villager = createActor({
      id: makeId("villager"),
      name: generateVillagerName(),
      x: 24 + (index % 3) * 18,
      y: 18 + Math.floor(index / 3) * 18,
    });
    villagers.push(villager);
    addLog(t("log.villagerJoined", { actor: villager.name }));
    checkStockRules();
    checkConstructionSites();
  }

  function normalizeRule(rule) {
    rule.target = Math.max(0, Number.isFinite(rule.target) ? Math.floor(rule.target) : 0);
  }

  function normalizeCraftEntry(entry) {
    entry.target = Math.max(0, Number.isFinite(entry.target) ? Math.floor(entry.target) : 0);
  }

  function stationTargetItemId(stationId, craftEntryId) {
    const entry = stationCraftEntries(stationId).find((item) => item.id === craftEntryId);
    const recipe = recipeById(entry?.recipeId);
    return recipe ? Object.keys(recipe.outputs)[0] : null;
  }

  function isGatherUnlocked(action) {
    if (action.requiresStation && !isStationAvailable(action.requiresStation)) {
      return false;
    }
    if (!action.requiresItem) {
      return true;
    }
    return actorCanTakeRequiredItem(playerActor, action.requiresItem)
      || villagers.some((villager) => actorCanTakeRequiredItem(villager, action.requiresItem));
  }

  function stockRuleSourceLabel(rule) {
    return gatherActionById(rule.actionId)?.label || t("common.gather");
  }

  function activeAutoTaskForRule(rule) {
    return gatherQueue.some((task) => task.ruleId === rule.id);
  }

  function craftEntryStatus(stationId, craftEntryId) {
    const entry = stationCraftEntries(stationId).find((item) => item.id === craftEntryId);
    const recipe = recipeById(entry?.recipeId);
    if (!entry || !recipe) {
      return t("status.invalidRecipe");
    }

    normalizeCraftEntry(entry);
    const itemId = Object.keys(recipe.outputs)[0];
    if (entry.target <= 0) {
      return t("status.noTarget");
    }
    if (!isStationAvailable(stationId) || !isRecipeUnlocked(recipe)) {
      return t("status.stationUnavailable");
    }
    if (!assignedVillagerCount(stationId)) {
      return t("status.noWorkers");
    }
    if (expectedStock(itemId) >= entry.target) {
      return t("status.actionDone");
    }
    if (stationTasks(stationId).some((task) => task.craftEntryId === craftEntryId)) {
      return t("status.running");
    }
    if (!hasResources(recipe)) {
      return t("status.insufficientResources");
    }
    if (!availableVillagerForRecipe(recipe)) {
      return t("status.workerBusy");
    }
    return t("status.actionPending");
  }

  function stockRuleStatus(rule) {
    if (!rule.enabled) {
      return t("status.disabled");
    }

    const action = gatherActionById(rule.actionId);
    if (!action || !isGatherUnlocked(action)) {
      if (action?.requiresStation && !isStationAvailable(action.requiresStation)) {
        return t("status.stationUnavailable");
      }
      return action?.requiresItem ? t("status.actionUnavailable") : t("taskPhase.idle");
    }
    if (!availableVillagerForGather(action)) {
      return t("status.noWorkers");
    }
    if (activeAutoTaskForRule(rule)) {
      return t("status.running");
    }
    if (expectedStock(rule.itemId) < rule.target) {
      return t("status.actionPending");
    }
    return t("status.actionDone");
  }

  function onRuleChanged(rule) {
    normalizeRule(rule);
    checkStockRules();
  }

  function canStartStationCraftEntry(stationId, craftEntryId) {
    const entry = stationCraftEntries(stationId).find((item) => item.id === craftEntryId);
    const recipe = recipeById(entry?.recipeId);
    return Boolean(recipe)
      && isStationAvailable(stationId)
      && isRecipeUnlocked(recipe)
      && Boolean(availableVillagerForRecipe(recipe));
  }

  function addStationCraftEntry(stationId, recipeId, target) {
    const station = stationAssignment(stationId);
    const recipe = recipeById(recipeId);
    if (!station || !recipe || recipe.station !== stationId) {
      return false;
    }
    const entry = {
      id: makeId("craft-entry"),
      recipeId,
      target: Math.max(0, Number.isFinite(target) ? Math.floor(target) : 0),
    };
    station.craftEntries.push(entry);
    addLog(t("log.craftEntryAdded", { station: stationName(stationId), recipe: recipe.name }));
    checkStockRules();
    return true;
  }

  function removeStationCraftEntry(stationId, craftEntryId) {
    const station = stationAssignment(stationId);
    if (!station) {
      return;
    }
    const index = station.craftEntries.findIndex((entry) => entry.id === craftEntryId);
    if (index < 0) {
      return;
    }
    const [entry] = station.craftEntries.splice(index, 1);
    const recipe = recipeById(entry.recipeId);
    addLog(t("log.craftEntryRemoved", { station: stationName(stationId), recipe: recipe?.name || t("common.craft") }));
  }

  function updateStationCraftEntryTarget(stationId, craftEntryId, target) {
    const entry = stationCraftEntries(stationId).find((item) => item.id === craftEntryId);
    if (!entry) {
      return;
    }
    entry.target = target;
    normalizeCraftEntry(entry);
    checkStockRules();
  }

  return {
    activeAutoTaskForRule,
    addStationCraftEntry,
    actorById,
    actorCanTakeRequiredItem,
    addVillager,
    addVillagerToStation,
    assignedVillagerCount,
    assignedVillagerIds,
    assignedVillagerList,
    availableVillagerForConstruction,
    availableVillagerForGather,
    availableVillagerForRecipe,
    availableVillagerForStation,
    canStartStationCraftEntry,
    craftEntryStatus,
    findTaskById,
    generateVillagerName,
    hasFacility,
    isGatherUnlocked,
    isPlayerActor,
    isRecipeUnlocked,
    isStationAvailable,
    normalizeCraftEntry,
    normalizeRule,
    onRuleChanged,
    removeStationCraftEntry,
    removeVillagerFromStation,
    stationAssignment,
    stationCraftEntries,
    stationName,
    stationRecipes,
    stationTargetItemId,
    stationTasks,
    stockRuleSourceLabel,
    stockRuleStatus,
    taskLabel,
    unassignedVillagersForStation,
    updateStationCraftEntryTarget,
    villagerAssignedStationsSummary,
    villagerCanTakeFromStorage,
    villagerHasItem,
    villagerInventorySummary,
    villagerName,
    villagerNote,
  };
}
