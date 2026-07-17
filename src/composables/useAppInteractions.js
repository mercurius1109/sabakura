export function useAppInteractions(options) {
  const {
    selectedWindow,
    pendingBuildingPlacementId,
    editingStockRuleId,
    editingStockRuleTarget,
    showAddStockRuleModal,
    draftStockRuleId,
    draftStockRuleTarget,
    selectedVillager,
    availableStockRules,
    editingStockRule,
    stockRules,
    playerTransferContext,
    playerActor,
    onRuleChanged,
    approachStructureTarget,
    approachTransferTarget,
    movePlayerTo,
    moveItemFromActorToStorage,
    moveItemFromActorToStation,
    moveItemFromStorageToActor,
    moveItemFromStationToActor,
    moveItemFromActorToActor,
    moveItemFromOtherActorToPlayer,
    dropPlayerItem,
    eatPlayerItem,
    startPlayerConstruction,
    canPlaceStructure,
    placeStructure,
    pickupFieldNode,
  } = options;

  function transferPlayerItemToStorage(itemId) {
    moveItemFromActorToStorage(playerActor, itemId, 1);
  }

  function transferPlayerItemToStation(itemId, stationId) {
    moveItemFromActorToStation(playerActor, stationId, itemId, 1);
  }

  function transferStorageItemToPlayer(itemId) {
    moveItemFromStorageToActor(playerActor, itemId, 1);
  }

  function transferStationItemToPlayer(itemId, stationId) {
    moveItemFromStationToActor(playerActor, stationId, itemId, 1);
  }

  function transferPlayerItemToVillager(itemId) {
    if (!selectedVillager.value) {
      return;
    }
    moveItemFromActorToActor(playerActor, selectedVillager.value, itemId, 1);
  }

  function transferVillagerItemToPlayer(itemId) {
    if (!selectedVillager.value) {
      return;
    }
    moveItemFromOtherActorToPlayer(selectedVillager.value, playerActor, itemId, 1);
  }

  function dropPlayerInventoryItem(itemId) {
    dropPlayerItem(itemId, 1);
  }

  function handlePlayerTransfer(itemId) {
    if (playerTransferContext.value.mode === "storage") {
      transferPlayerItemToStorage(itemId);
      return;
    }

    if (playerTransferContext.value.mode === "actor") {
      transferPlayerItemToVillager(itemId);
      return;
    }

    if (playerTransferContext.value.mode === "station") {
      transferPlayerItemToStation(itemId, playerTransferContext.value.stationId);
      return;
    }

    dropPlayerInventoryItem(itemId);
  }

  function handlePlayerItemAction({ itemId, actionId }) {
    if (!itemId || !actionId) {
      return;
    }
    if (actionId === "eat") {
      eatPlayerItem(itemId);
      return;
    }
    handlePlayerTransfer(itemId);
  }

  function openStockRuleModal(rule) {
    editingStockRuleId.value = rule.id;
    editingStockRuleTarget.value = Math.max(1, Number(rule.target) || 1);
  }

  function closeStockRuleModal() {
    editingStockRuleId.value = null;
  }

  function openAddStockRuleModal() {
    showAddStockRuleModal.value = true;
    draftStockRuleId.value = availableStockRules.value[0]?.id || null;
    draftStockRuleTarget.value = 1;
  }

  function closeAddStockRuleModal() {
    showAddStockRuleModal.value = false;
    draftStockRuleId.value = null;
    draftStockRuleTarget.value = 1;
  }

  function submitStockRuleEntry() {
    const rule = stockRules.find((entry) => entry.id === draftStockRuleId.value);
    if (!rule || Number(draftStockRuleTarget.value) < 1) {
      return;
    }

    rule.enabled = true;
    rule.target = Number(draftStockRuleTarget.value);
    onRuleChanged(rule);
    closeAddStockRuleModal();
  }

  function submitStockRuleEdit() {
    if (!editingStockRule.value) {
      return;
    }
    if (Number(editingStockRuleTarget.value) < 1) {
      return;
    }

    editingStockRule.value.enabled = true;
    editingStockRule.value.target = Number(editingStockRuleTarget.value);
    onRuleChanged(editingStockRule.value);
    closeStockRuleModal();
  }

  function removeStockRule(ruleId) {
    const rule = stockRules.find((entry) => entry.id === ruleId);
    if (!rule) {
      return;
    }

    rule.enabled = false;
    onRuleChanged(rule);
    if (editingStockRuleId.value === ruleId) {
      closeStockRuleModal();
    }
  }

  function closeWindow() {
    selectedWindow.value = null;
  }

  function openPlayerWindow() {
    selectedWindow.value = { type: "player" };
  }

  function openCraftWindow() {
    selectedWindow.value = { type: "craft" };
  }

  function openStructureWindow(structureId) {
    selectedWindow.value = { type: structureId };
    approachStructureTarget(structureId);
  }

  function openStorageCompareWindow() {
    selectedWindow.value = { type: "storage-compare" };
    approachTransferTarget("storage");
  }

  function openVillageWindow() {
    selectedWindow.value = { type: "village" };
  }

  function openBuildWindow() {
    pendingBuildingPlacementId.value = null;
    selectedWindow.value = { type: "build" };
  }

  function openVillagerCompareWindow(villagerId) {
    selectedWindow.value = { type: "villager-compare", id: villagerId };
    approachTransferTarget("actor", villagerId);
  }

  function handleConstructionSiteClick(structureId) {
    startPlayerConstruction(structureId);
  }

  function beginBuildingPlacement(structureId) {
    if (!canPlaceStructure(structureId)) {
      return;
    }
    pendingBuildingPlacementId.value = structureId;
    closeWindow();
  }

  function cancelPendingBuildingPlacement() {
    pendingBuildingPlacementId.value = null;
  }

  function handleFieldClick(position) {
    if (!pendingBuildingPlacementId.value) {
      movePlayerTo(position);
      return;
    }

    const placed = placeStructure(pendingBuildingPlacementId.value, position);
    if (!placed) {
      return;
    }

    pendingBuildingPlacementId.value = null;
  }

  function pickupResourceNode(nodeId) {
    pickupFieldNode(nodeId);
  }

  return {
    transferPlayerItemToStorage,
    transferPlayerItemToStation,
    transferStorageItemToPlayer,
    transferStationItemToPlayer,
    transferPlayerItemToVillager,
    transferVillagerItemToPlayer,
    dropPlayerInventoryItem,
    handlePlayerTransfer,
    handlePlayerItemAction,
    openStockRuleModal,
    closeStockRuleModal,
    openAddStockRuleModal,
    closeAddStockRuleModal,
    submitStockRuleEntry,
    submitStockRuleEdit,
    removeStockRule,
    closeWindow,
    openPlayerWindow,
    openCraftWindow,
    openStructureWindow,
    openStorageCompareWindow,
    openVillageWindow,
    openBuildWindow,
    openVillagerCompareWindow,
    handleConstructionSiteClick,
    beginBuildingPlacement,
    cancelPendingBuildingPlacement,
    handleFieldClick,
    pickupResourceNode,
  };
}
