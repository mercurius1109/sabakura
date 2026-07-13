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
  function stockRulePriority(rule) {
    const expected = expectedStock(rule.itemId);
    const safeTarget = Math.max(1, rule.target || 0);
    return {
      expected,
      shortage: Math.max(0, safeTarget - expected),
      fulfillment: expected / safeTarget,
    };
  }

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
    const candidateRules = stockRules
      .map((rule) => {
        normalizeRule(rule);
        return rule;
      })
      .filter((rule) => {
        const expected = expectedStock(rule.itemId);
        return rule.enabled && expected < rule.target && !activeAutoTaskForRule(rule);
      })
      .sort((left, right) => {
        const leftPriority = stockRulePriority(left);
        const rightPriority = stockRulePriority(right);
        if (leftPriority.fulfillment !== rightPriority.fulfillment) {
          return leftPriority.fulfillment - rightPriority.fulfillment;
        }
        if (leftPriority.shortage !== rightPriority.shortage) {
          return rightPriority.shortage - leftPriority.shortage;
        }
        return left.itemId.localeCompare(right.itemId);
      });

    candidateRules.forEach((rule) => {
      const action = gatherActionById(rule.actionId);
      const preferredStationId = action?.requiresStation || "storage";
      const villager = action ? availableVillagerForGather(action, preferredStationId) : null;
      if (!action || !isGatherUnlocked(action) || !villager || !findGatherTargetNode(action, null, villager)) {
        return;
      }
      startGather(action.id, { source: "auto", ruleId: rule.id, preferredStationId });
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
