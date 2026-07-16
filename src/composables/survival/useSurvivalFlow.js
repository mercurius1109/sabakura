export function createSurvivalFlow({
  playerActor,
  stockRules,
  recipeById,
  expectedStock,
  fieldNodeById,
  isFieldNodeVisible,
  gatherActionForNode,
  startPlayerFieldTask,
  startActorFieldTask,
  startGather,
  startConstruction,
  startCraft,
  actorById,
  stationCraftEntries,
  isRecipeUnlocked,
  hasActorResources,
  actorInventoryCount,
}) {
  function pickupFieldNode(nodeId) {
    const node = fieldNodeById(nodeId);
    if (!node || !isFieldNodeVisible(node)) {
      return false;
    }

    const action = gatherActionForNode(node);
    if (!action) {
      return false;
    }

    return startPlayerFieldTask(nodeId);
  }

  function canStartPlayerRecipe(recipe, isPlayerBusy) {
    return Boolean(recipe)
      && recipe.station === "hand"
      && playerActor.fullness > 0
      && !isPlayerBusy.value
      && isRecipeUnlocked(recipe)
      && hasActorResources(playerActor, recipe);
  }

  function shouldVillagerContinue(task) {
    if (task.workerType !== "villager") {
      return false;
    }

    if (task.kind === "gather") {
      const actor = actorById(task.villagerId);
      const taskActionId = task.resumeActionId || task.actionId;
      const rule = stockRules.find((entry) => entry.actionId === taskActionId);
      const capacity = actor?.inventoryCapacity ?? Number.POSITIVE_INFINITY;
      return Boolean(rule)
        && rule.enabled
        && expectedStock(rule.itemId) < rule.target
        && actorInventoryCount(actor) < capacity;
    }

    if (task.source !== "station-auto" || !task.craftEntryId) {
      return false;
    }

    const entry = stationCraftEntries(task.station).find((item) => item.id === task.craftEntryId);
    const recipe = recipeById(task.recipeId);
    if (!entry || !recipe || entry.recipeId !== recipe.id) {
      return false;
    }

    const itemId = Object.keys(recipe.outputs)[0];
    return entry.target > 0 && expectedStock(itemId) < entry.target;
  }

  function restartVillagerTask(task) {
    if (!shouldVillagerContinue(task)) {
      return;
    }

    if (task.kind === "gather") {
      const taskActionId = task.resumeActionId || task.actionId;
      const rule = stockRules.find((entry) => entry.actionId === taskActionId);
      startGather(taskActionId, {
        source: task.source,
        ruleId: rule?.id || null,
        preferredStationId: task.station === "field" ? null : task.station,
      });
      return;
    }

    startCraft(task.recipeId, { workerType: "villager", source: "station-auto", craftEntryId: task.craftEntryId });
  }

  return {
    canStartPlayerRecipe,
    pickupFieldNode,
    restartVillagerTask,
    shouldVillagerContinue,
  };
}
