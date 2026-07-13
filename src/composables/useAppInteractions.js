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
    approachTransferTarget,
    movePlayerTo,
    moveItemFromActorToStorage,
    moveItemFromStorageToActor,
    moveItemFromActorToActor,
    moveItemFromOtherActorToPlayer,
    dropPlayerItem,
    startPlayerConstruction,
    canPlaceStructure,
    placeStructure,
    pickupFieldNode,
  } = options;

  function transferPlayerItemToStorage(itemId) {
    moveItemFromActorToStorage(playerActor, itemId, 1);
  }

  function transferStorageItemToPlayer(itemId) {
    moveItemFromStorageToActor(playerActor, itemId, 1);
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

    dropPlayerInventoryItem(itemId);
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

  function openWorkbenchWindow() {
    selectedWindow.value = { type: "workbench" };
  }

  function openCraftWindow() {
    selectedWindow.value = { type: "craft" };
  }

  function openLumberjackHutWindow() {
    selectedWindow.value = { type: "lumberjackHut" };
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
    const started = startPlayerConstruction(structureId);
    if (!started) {
      openBuildWindow();
    }
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
    transferStorageItemToPlayer,
    transferPlayerItemToVillager,
    transferVillagerItemToPlayer,
    dropPlayerInventoryItem,
    handlePlayerTransfer,
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
    openWorkbenchWindow,
    openLumberjackHutWindow,
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
