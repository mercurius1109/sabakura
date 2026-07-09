export function createSurvivalAutomation({
  now,
  fieldNodes,
  stations,
  constructionSites,
  stockRules,
  expectedStock,
  normalizeRule,
  normalizeCraftEntry,
  activeAutoTaskForRule,
  gatherActionById,
  isGatherUnlocked,
  availableVillagerForGather,
  findGatherTargetNode,
  startGather,
  stationCraftEntries,
  recipeById,
  isStationAvailable,
  isRecipeUnlocked,
  availableVillagerForRecipe,
  hasResources,
  startCraft,
  randomFieldPosition,
  startConstruction,
}) {
  function autoCraftAssignedStations() {
    stations.forEach((station) => {
      stationCraftEntries(station.id).forEach((entry) => {
        normalizeCraftEntry(entry);
        const recipe = recipeById(entry.recipeId);
        if (!recipe || entry.target <= 0 || !isStationAvailable(station.id) || !isRecipeUnlocked(recipe)) {
          return;
        }

        const itemId = Object.keys(recipe.outputs)[0];
        while (expectedStock(itemId) < entry.target) {
          const villager = availableVillagerForRecipe(recipe);
          if (!villager || !hasResources(recipe)) {
            break;
          }

          const started = startCraft(recipe.id, { source: "station-auto", workerType: "villager", craftEntryId: entry.id });
          if (!started) {
            break;
          }
        }
      });
    });
  }

  function respawnFieldNodes() {
    fieldNodes.forEach((node) => {
      if (node.hiddenUntil && now.value >= node.hiddenUntil) {
        if (!node.transient && node.type === "pickup") {
          const position = randomFieldPosition();
          node.x = position.x;
          node.y = position.y;
        }
        node.hiddenUntil = null;
      }
    });
  }

  function checkStockRules() {
    stockRules.forEach((rule) => {
      normalizeRule(rule);
      const expected = expectedStock(rule.itemId);
      if (!rule.enabled || expected >= rule.target || activeAutoTaskForRule(rule)) {
        return;
      }

      const action = gatherActionById(rule.actionId);
      if (!action || !isGatherUnlocked(action) || !availableVillagerForGather(action) || !findGatherTargetNode(action)) {
        return;
      }
      startGather(action.id, { source: "auto", ruleId: rule.id });
    });

    autoCraftAssignedStations();
  }

  function checkConstructionSites() {
    constructionSites.forEach((site) => {
      startConstruction(site.structureId);
    });
  }

  return {
    autoCraftAssignedStations,
    checkConstructionSites,
    checkStockRules,
    respawnFieldNodes,
  };
}
