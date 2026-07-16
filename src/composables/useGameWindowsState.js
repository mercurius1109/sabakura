import { computed, unref } from "vue";
import { t } from "../i18n/index.js";

export function useGameWindowsState(options) {
  const {
    selectedWindow,
    currentTutorialTargets,
    itemDefinitions,
    buildingDefinitions,
    inventory,
    storage,
    placedStructures,
    stockRules,
    pendingBuildingPlacementId,
    draftStockRuleId,
    draftStockRuleTarget,
    editingStockRuleId,
    playerActor,
    villagers,
    stations,
    gatherActions,
    constructionQueue,
    craftQueue,
    gatherQueue,
    playerRecipes,
    canStartPlayerRecipe,
    canPlaceStructure,
    buildingStatus,
    isPlayerAdjacentToStorage,
    isPlayerAdjacentToActor,
    assignedVillagerList,
    unassignedVillagersForStation,
    stationTasks,
    stationRecipes,
    stationCraftEntries,
    stationTargetItemId,
    expectedStock,
    craftEntryStatus,
    canStartStationCraftEntry,
    taskProgress,
    stockRuleStatus,
    stationName,
    isStationAvailable,
    formatList,
    findTaskById,
  } = options;

  const tutorialHighlightClass = "tutorial-highlight tutorial-highlight-ui";
  const resolvedInventory = computed(() => unref(inventory) || {});

  const isCompareWindow = computed(() =>
    selectedWindow.value?.type === "storage-compare" || selectedWindow.value?.type === "villager-compare",
  );

  const isStorageCompareWindow = computed(() => selectedWindow.value?.type === "storage-compare");
  const isVillagerCompareWindow = computed(() => selectedWindow.value?.type === "villager-compare");

  const selectedVillager = computed(() => {
    if (selectedWindow.value?.type !== "villager-compare") {
      return null;
    }
    return villagers.find((villager) => villager.id === selectedWindow.value.id) || null;
  });

  const playerItemCards = computed(() => itemCardsFromStore(playerActor.inventory, itemDefinitions));
  const playerOwnedKinds = computed(() => ownedKindsFromStore(playerActor.inventory));
  const storageTransferEntries = computed(() => actionableEntries(storage, itemDefinitions));
  const selectedVillagerTransferOutEntries = computed(() => actionableEntries(selectedVillager.value?.inventory || null, itemDefinitions));
  const storageAssignedVillagers = computed(() => assignedVillagerList("storage"));
  const storageAvailableVillagers = computed(() => unassignedVillagersForStation("storage"));
  const isPlayerAdjacentToSelectedVillager = computed(() => (
    selectedVillager.value ? isPlayerAdjacentToActor(selectedVillager.value) : false
  ));

  const selectedVillagerStations = computed(() => {
    if (!selectedVillager.value) {
      return [];
    }

    return selectedVillager.value.assignedStations.map((id) => ({
      id,
      name: stationName(id),
    }));
  });

  const editingStockRule = computed(() =>
    stockRules.find((rule) => rule.id === editingStockRuleId.value) || null,
  );
  const showEditStockRuleModal = computed(() => Boolean(editingStockRuleId.value));
  const registeredStockRules = computed(() => uniqueStockRules(stockRules.filter((rule) => rule.enabled), gatherActions));
  const availableStockRules = computed(() =>
    uniqueStockRules(
      stockRules.filter((rule) =>
        !rule.enabled && !stockRules.some((otherRule) => otherRule.enabled && otherRule.itemId === rule.itemId),
      ),
      gatherActions,
    ),
  );
  const canSubmitStockRule = computed(() =>
    Boolean(draftStockRuleId.value) && Number(draftStockRuleTarget.value) >= 1,
  );

  const currentPlayerTask = computed(() => taskForActor(playerActor, playerActor.id, gatherQueue, craftQueue, constructionQueue, findTaskById));
  const currentSelectedVillagerTask = computed(() => taskForActor(selectedVillager.value, playerActor.id, gatherQueue, craftQueue, constructionQueue, findTaskById));

  const selectedStationWindow = computed(() => {
    const stationId = selectedWindow.value?.type;
    const station = stations.find((entry) => entry.id === stationId);
    if (!station) {
      return null;
    }

    return {
      station,
      isAvailable: isStationAvailable(stationId),
      assignedVillagers: assignedVillagerList(stationId),
      availableVillagers: unassignedVillagersForStation(stationId),
      tasks: stationTasks(stationId),
      recipes: stationRecipes(stationId),
      playerRecipes: stationRecipes(stationId),
      craftEntries: stationCraftEntries(stationId),
      highlightAddVillager: hasTutorialTarget(currentTutorialTargets, "station-action", `${stationId}:add-villager`),
      highlightAddCraft: hasTutorialTarget(currentTutorialTargets, "station-action", `${stationId}:add-craft`),
      currentAmount: (craftEntryId) => {
        const itemId = stationTargetItemId(stationId, craftEntryId);
        return itemId ? resolvedInventory.value[itemId] || 0 : 0;
      },
      expectedAmount: (craftEntryId) => {
        const itemId = stationTargetItemId(stationId, craftEntryId);
        return itemId ? expectedStock(itemId) : 0;
      },
      craftEntryStatus: (craftEntryId) => craftEntryStatus(stationId, craftEntryId),
      canStartEntry: (craftEntryId) => canStartStationCraftEntry(stationId, craftEntryId),
    };
  });

  const playerTransferContext = computed(() => {
    if (isStorageCompareWindow.value) {
      return {
        mode: "storage",
        label: t("ui.storage"),
        disabled: !isPlayerAdjacentToStorage.value,
        disabledText: t("ui.moveNextToStorage"),
      };
    }

    if (isVillagerCompareWindow.value && selectedVillager.value) {
      return {
        mode: "actor",
        label: selectedVillager.value.name,
        disabled: !isPlayerAdjacentToSelectedVillager.value,
        disabledText: t("ui.moveNextToVillager"),
      };
    }

    return {
      mode: "drop",
      label: t("ui.groundItems"),
      disabled: false,
      disabledText: "",
    };
  });

  const playerTransferCaption = computed(() => t("ui.transferTo", { target: playerTransferContext.value.label }));
  const playerTransferDisabled = computed(() => playerTransferContext.value.disabled);
  const playerTransferDisabledText = computed(() => playerTransferContext.value.disabledText);
  const playerItemActions = (item) => {
    if (!item || playerTransferContext.value.mode !== "drop") {
      return [];
    }

    const actions = [];
    if (Number(item.nutrition) > 0) {
      actions.push({ id: "eat", label: t("ui.eat") });
    }
    actions.push({ id: "drop", label: t("ui.drop") });
    return actions;
  };

  const playerBuildCards = computed(() =>
    buildingDefinitions.map((building) => ({
      id: building.id,
      name: itemDefinitions[building.id]?.name || building.name || t(`item.${building.id}`),
      icon: itemDefinitions[building.id]?.icon || building.icon || "?",
      costs: building.costs,
    })),
  );

  const pendingBuildingPlacement = computed(() =>
    playerBuildCards.value.find((building) => building.id === pendingBuildingPlacementId.value) || null,
  );

  const storageTitle = computed(() => (placedStructures.storage ? t("ui.storage") : t("ui.groundItems")));

  function selectedVillagerStationsLabel(villager) {
    if (!villager?.assignedStations?.length) {
      return t("ui.noStation");
    }

    return villager.assignedStations.map((stationId) => stationName(stationId)).join(", ");
  }

  function playerCraftOutputItem(recipe) {
    const outputItemId = Object.keys(recipe.outputs || {})[0];
    return outputItemId ? itemDefinitions[outputItemId] : null;
  }

  function playerCraftIcon(recipe) {
    return playerCraftOutputItem(recipe)?.icon || "?";
  }

  function playerCraftTooltip(recipe) {
    const outputItem = playerCraftOutputItem(recipe);
    const outputName = outputItem?.name || recipe.name;
    return `${outputName}\n${formatList(recipe.costs)}`;
  }

  function playerBuildTooltip(building) {
    return `${building.name}\n${formatList(building.costs)}\n${buildingStatus(building.id)}`;
  }

  function stockRuleTooltip(rule) {
    return `${itemDefinitions[rule.itemId].name}\n${storage[rule.itemId] || 0}/${rule.target}\n${stockRuleStatus(rule)}`;
  }

  function playerRecipeButtonClass(recipe) {
    const base = canStartPlayerRecipe(recipe)
      ? "border-[#b2c79a] bg-white/90 hover:-translate-y-0.5"
      : "cursor-not-allowed border-line bg-white/60 opacity-60";
    return hasTutorialTarget(currentTutorialTargets, "player-recipe", recipe.id)
      ? `${base} ${tutorialHighlightClass}`
      : base;
  }

  function playerBuildButtonClass(building) {
    const base = canPlaceStructure(building.id)
      ? "border-[#b2c79a] bg-white/90 hover:-translate-y-0.5"
      : "cursor-not-allowed border-line bg-white/60 opacity-60";
    return hasTutorialTarget(currentTutorialTargets, "player-building", building.id)
      ? `${base} ${tutorialHighlightClass}`
      : base;
  }

  function buildMenuButtonClass(building) {
    const base = canPlaceStructure(building.id)
      ? "border-[#b2c79a] bg-white/90 hover:-translate-y-0.5"
      : "cursor-not-allowed border-line bg-white/60 opacity-60";
    return hasTutorialTarget(currentTutorialTargets, "player-building", building.id)
      ? `${base} ${tutorialHighlightClass}`
      : base;
  }

  return {
    tutorialHighlightClass,
    isCompareWindow,
    isStorageCompareWindow,
    isVillagerCompareWindow,
    selectedVillager,
    playerItemCards,
    playerOwnedKinds,
    storageTransferEntries,
    selectedVillagerTransferOutEntries,
    storageAssignedVillagers,
    storageAvailableVillagers,
    isPlayerAdjacentToSelectedVillager,
    selectedVillagerStations,
    editingStockRule,
    showEditStockRuleModal,
    registeredStockRules,
    availableStockRules,
    canSubmitStockRule,
    currentPlayerTask,
    currentSelectedVillagerTask,
    selectedStationWindow,
    playerTransferCaption,
    playerTransferDisabled,
    playerTransferDisabledText,
    playerTransferContext,
    playerItemActions,
    playerBuildCards,
    pendingBuildingPlacement,
    storageTitle,
    resolvedInventory,
    selectedVillagerStationsLabel,
    playerCraftIcon,
    playerCraftTooltip,
    playerBuildTooltip,
    stockRuleTooltip,
    playerRecipeButtonClass,
    playerBuildButtonClass,
    buildMenuButtonClass,
    hasTutorialTarget: (kind, id) => hasTutorialTarget(currentTutorialTargets, kind, id),
  };
}

function itemCardsFromStore(store, itemDefinitions) {
  if (!store) {
    return [];
  }

  return Object.entries(itemDefinitions)
    .filter(([, meta]) => meta.kind !== "structure")
    .map(([id, meta]) => ({
      id,
      name: meta.name,
      icon: meta.icon,
      kind: meta.kind,
      nutrition: meta.nutrition || 0,
      amount: store[id] || 0,
      expected: store[id] || 0,
    }));
}

function ownedKindsFromStore(store) {
  if (!store) {
    return 0;
  }
  return Object.values(store).filter((amount) => amount > 0).length;
}

function actionableEntries(store, itemDefinitions) {
  return itemCardsFromStore(store, itemDefinitions).filter((item) => item.amount > 0);
}

function taskForActor(actor, playerActorId, gatherQueue, craftQueue, constructionQueue, findTaskById) {
  if (!actor) {
    return null;
  }

  const currentTask = findTaskById(actor.currentTaskId);
  if (currentTask) {
    return currentTask;
  }

  if (actor.taskQueue?.length) {
    const queuedTask = findTaskById(actor.taskQueue[0]);
    if (queuedTask) {
      return queuedTask;
    }
  }

  return [...gatherQueue, ...craftQueue, ...constructionQueue].find((task) => {
    if (task.villagerId === actor.id) {
      return true;
    }
    return task.workerType === "self" && actor.id === playerActorId;
  }) || null;
}

function stockRulePriority(rule, gatherActions) {
  const action = gatherActions.find((entry) => entry.id === rule.actionId);
  if (!action) {
    return 0;
  }
  let score = 0;
  if (action.requiresStation) {
    score += 2;
  }
  if (action.requiresItem) {
    score += 1;
  }
  return score;
}

function uniqueStockRules(rules, gatherActions) {
  const byItemId = new Map();

  rules.forEach((rule) => {
    const current = byItemId.get(rule.itemId);
    if (!current) {
      byItemId.set(rule.itemId, rule);
      return;
    }

    if (rule.enabled && !current.enabled) {
      byItemId.set(rule.itemId, rule);
      return;
    }

    if (stockRulePriority(rule, gatherActions) > stockRulePriority(current, gatherActions)) {
      byItemId.set(rule.itemId, rule);
    }
  });

  return [...byItemId.values()];
}

function hasTutorialTarget(currentTutorialTargets, kind, id) {
  return currentTutorialTargets.value.some((target) => target.kind === kind && target.id === id);
}
