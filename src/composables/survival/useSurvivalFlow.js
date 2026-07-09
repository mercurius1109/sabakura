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
}) {
  function startPlannedTask(nextTask) {
    if (!nextTask) {
      return false;
    }

    if (nextTask.kind === "actor-gather") {
      return startActorFieldTask(actorById(nextTask.actorId), nextTask.nodeId, nextTask.options || {});
    }

    if (nextTask.kind === "gather") {
      return startGather(nextTask.actionId, nextTask.options || {});
    }

    if (nextTask.kind === "build") {
      return startConstruction(nextTask.structureId);
    }

    if (nextTask.kind === "craft") {
      return startCraft(nextTask.recipeId, nextTask.options || {});
    }

    return false;
  }

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
      && !isPlayerBusy.value
      && isRecipeUnlocked(recipe)
      && hasActorResources(playerActor, recipe);
  }

  function shouldVillagerContinue(task) {
    if (task.workerType !== "villager") {
      return false;
    }

    if (task.kind === "gather") {
      const rule = stockRules.find((entry) => entry.actionId === task.actionId);
      return Boolean(rule) && rule.enabled && expectedStock(rule.itemId) < rule.target;
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
    if (task.nextTask) {
      startPlannedTask(task.nextTask);
      return;
    }

    if (!shouldVillagerContinue(task)) {
      return;
    }

    if (task.kind === "gather") {
      const rule = stockRules.find((entry) => entry.actionId === task.actionId);
      startGather(task.actionId, { source: task.source, ruleId: rule?.id || null });
      return;
    }

    startCraft(task.recipeId, { workerType: "villager", source: "station-auto", craftEntryId: task.craftEntryId });
  }

  return {
    canStartPlayerRecipe,
    pickupFieldNode,
    restartVillagerTask,
    shouldVillagerContinue,
    startPlannedTask,
  };
}
