const tutorialSequence = [
  gatherItemStep("wood", 1),
  gatherItemStep("stone", 1),
  craftRecipeStep("hammer"),
  buildStructureStep("workbench"),
  completeStructureStep("workbench"),
  villagerCountStep(2),
  buildStructureStep("storage"),
  completeStructureStep("storage"),
  stockRuleStep("wood"),
  buildStructureStep("lumberjackHut"),
  completeStructureStep("lumberjackHut"),
  stationAssignmentStep("lumberjackHut", 1),
  stationCraftEntryStep("workbench", "plank"),
  stationCraftEntryStep("workbench", "stick"),
  stationCraftEntryStep("workbench", "stoneAxe"),
];

export function createTutorialSteps({
  recipeById,
  buildingById,
  stationById,
  getPlayerItemCount,
  getVillagerCount,
  hasPlacedOrStarted,
  isStructureCompleted,
  getAssignedVillagerCount,
  hasStationCraftEntry,
  isStockRuleEnabled,
}) {
  return tutorialSequence.map((factory) =>
    factory({
      recipeById,
      buildingById,
      stationById,
      getPlayerItemCount,
      getVillagerCount,
      hasPlacedOrStarted,
      isStructureCompleted,
      getAssignedVillagerCount,
      hasStationCraftEntry,
      isStockRuleEnabled,
    }),
  );
}

function gatherItemStep(itemId, amount) {
  return ({ getPlayerItemCount }) => ({
    id: `gather-${itemId}`,
    titleKey: "tutorial.step.gather.title",
    descriptionKey: "tutorial.step.gather.description",
    textParams: { itemKey: `item.${itemId}` },
    highlightTargets: [{ kind: "field-resource", id: itemId }],
    isCompleted: () => getPlayerItemCount(itemId) >= amount,
    getRequirements: () => [
      {
        itemId,
        needed: amount,
        current: getPlayerItemCount(itemId),
      },
    ],
  });
}

function craftRecipeStep(recipeId) {
  return ({ recipeById, getPlayerItemCount }) => {
    const recipe = recipeById(recipeId);
    const outputItemId = Object.keys(recipe?.outputs || {})[0] || recipeId;

    return {
      id: `craft-${recipeId}`,
      titleKey: "tutorial.step.craft.title",
      descriptionKey: recipe?.station === "hand"
        ? "tutorial.step.craft.handDescription"
        : "tutorial.step.craft.stationDescription",
      textParams: { itemKey: `item.${outputItemId}` },
      highlightTargets: recipe?.station === "hand"
        ? [
          { kind: "field-player", id: "player" },
          { kind: "player-recipe", id: recipeId },
        ]
        : [
          { kind: "field-structure", id: recipe?.station || "workbench" },
          { kind: "station-action", id: `${recipe?.station || "workbench"}:add-craft` },
        ],
      isCompleted: () => getPlayerItemCount(outputItemId) >= 1,
      getRequirements: () => buildRequirements(recipe?.costs || {}, getPlayerItemCount),
    };
  };
}

function buildStructureStep(buildingId) {
  return ({ buildingById, getPlayerItemCount, hasPlacedOrStarted }) => ({
    id: `build-${buildingId}`,
    titleKey: "tutorial.step.build.title",
    descriptionKey: "tutorial.step.build.description",
    textParams: { buildingKey: `building.${buildingId}` },
    highlightTargets: [
      { kind: "menu", id: "build" },
      { kind: "player-building", id: buildingId },
      { kind: "field-structure", id: buildingId },
      { kind: "field-construction", id: buildingId },
    ],
    isCompleted: () => hasPlacedOrStarted(buildingId),
    getRequirements: () => buildRequirements(buildingById(buildingId)?.costs || {}, getPlayerItemCount),
  });
}

function completeStructureStep(buildingId) {
  return ({ isStructureCompleted }) => ({
    id: `complete-${buildingId}`,
    titleKey: "tutorial.step.completeBuild.title",
    descriptionKey: "tutorial.step.completeBuild.description",
    textParams: { buildingKey: `building.${buildingId}` },
    highlightTargets: [
      { kind: "field-structure", id: buildingId },
      { kind: "field-construction", id: buildingId },
      { kind: "field-player", id: "player" },
    ],
    isCompleted: () => isStructureCompleted(buildingId),
    getRequirements: () => [],
  });
}

function villagerCountStep(targetCount) {
  return ({ getVillagerCount }) => ({
    id: `villagers-${targetCount}`,
    titleKey: "tutorial.step.villagerCount.title",
    descriptionKey: "tutorial.step.villagerCount.description",
    textParams: { count: targetCount },
    highlightTargets: [
      { kind: "menu", id: "village" },
      { kind: "village-action", id: "add-villager" },
    ],
    isCompleted: () => getVillagerCount() >= targetCount,
    getRequirements: () => [
      {
        labelKey: "tutorial.requirement.villagers",
        needed: targetCount,
        current: getVillagerCount(),
      },
    ],
  });
}

function stationAssignmentStep(stationId, count) {
  return ({ stationById, getAssignedVillagerCount }) => ({
    id: `assign-${stationId}`,
    titleKey: "tutorial.step.stationAssign.title",
    descriptionKey: "tutorial.step.stationAssign.description",
    textParams: { stationKey: `station.${stationId}.name` },
    highlightTargets: [
      { kind: "field-structure", id: stationId },
      { kind: "station-action", id: `${stationId}:add-villager` },
    ],
    isCompleted: () => getAssignedVillagerCount(stationId) >= count,
    getRequirements: () => [
      {
        labelKey: "tutorial.requirement.stationWorkers",
        needed: count,
        current: getAssignedVillagerCount(stationId),
        labelParams: { station: stationById(stationId)?.name || stationId },
      },
    ],
  });
}

function stationCraftEntryStep(stationId, recipeId) {
  return ({ stationById, hasStationCraftEntry }) => ({
    id: `station-entry-${stationId}-${recipeId}`,
    titleKey: "tutorial.step.stationCraftEntry.title",
    descriptionKey: "tutorial.step.stationCraftEntry.description",
    textParams: {
      stationKey: `station.${stationId}.name`,
      recipeKey: `recipe.${recipeId}`,
    },
    highlightTargets: [
      { kind: "field-structure", id: stationId },
      { kind: "station-action", id: `${stationId}:add-craft` },
    ],
    isCompleted: () => hasStationCraftEntry(stationId, recipeId),
    getRequirements: () => [],
  });
}

function stockRuleStep(itemId) {
  return ({ isStockRuleEnabled }) => ({
    id: `stock-rule-${itemId}`,
    titleKey: "tutorial.step.stockRule.title",
    descriptionKey: "tutorial.step.stockRule.description",
    textParams: { itemKey: `item.${itemId}` },
    highlightTargets: [
      { kind: "field-structure", id: "storage" },
      { kind: "storage-rule", id: itemId },
    ],
    isCompleted: () => isStockRuleEnabled(itemId),
    getRequirements: () => [],
  });
}

function buildRequirements(costs, getPlayerItemCount) {
  return Object.entries(costs).map(([itemId, needed]) => ({
    itemId,
    needed,
    current: getPlayerItemCount(itemId),
  }));
}
