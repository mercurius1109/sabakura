import { computed, onMounted, onUnmounted, ref } from "vue";

const DEV_AUTOPLAY_INTERVAL_MS = 900;
const DEV_STEP_COOLDOWN_MS = 1200;

export function useDevTutorialAutoplay({
  enabled,
  currentTutorialStep,
  isTutorialComplete,
  playerActor,
  villagers,
  visibleFieldNodes,
  pickupFieldNode,
  startPlayerCraft,
  placeStructure,
  startPlayerConstruction,
  addVillager,
  addVillagerToStation,
  assignedVillagerList,
  unassignedVillagersForStation,
  stationCraftEntries,
  addStationCraftEntry,
  stockRules,
  onRuleChanged,
  buildingById,
  canPlaceStructure,
}) {
  const lastActionAt = ref(0);
  const lastActionStepId = ref("");
  let intervalId = null;

  const statusText = computed(() => {
    if (isTutorialComplete.value) {
      return "完了";
    }
    return currentTutorialStep.value?.title || "待機中";
  });

  function currentTime() {
    return Date.now();
  }

  function isOnCooldown(stepId) {
    return lastActionStepId.value === stepId
      && currentTime() - lastActionAt.value < DEV_STEP_COOLDOWN_MS;
  }

  function markAction(stepId) {
    lastActionStepId.value = stepId;
    lastActionAt.value = currentTime();
  }

  function nearestNodeForItem(itemId) {
    const nodes = visibleFieldNodes()
      .filter((node) => node.type === "pickup" && node.itemId === itemId);

    if (nodes.length === 0) {
      return null;
    }

    return nodes.reduce((best, node) => {
      if (!best) {
        return node;
      }

      const bestDistance = distanceBetween(best, playerActor);
      const nodeDistance = distanceBetween(node, playerActor);
      return nodeDistance < bestDistance ? node : best;
    }, null);
  }

  function playerHasPendingTask() {
    return Boolean(playerActor?.currentTaskId || playerActor?.taskId || playerActor?.taskQueue?.length);
  }

  function runGatherStep(itemId, stepId) {
    if (playerHasPendingTask()) {
      return false;
    }
    const node = nearestNodeForItem(itemId);
    if (!node) {
      return false;
    }
    pickupFieldNode(node.id);
    markAction(stepId);
    return true;
  }

  function runMissingRequirementGather(step) {
    if (playerHasPendingTask()) {
      return false;
    }
    const pendingRequirement = (step?.requirements || []).find((requirement) =>
      requirement?.itemId && Number(requirement.remaining) > 0,
    );
    if (!pendingRequirement) {
      return false;
    }

    const node = nearestNodeForItem(pendingRequirement.itemId);
    if (!node) {
      return false;
    }

    pickupFieldNode(node.id);
    markAction(step.id);
    return true;
  }

  function runCraftStep(recipeId, stepId) {
    if (playerHasPendingTask()) {
      return false;
    }
    const started = startPlayerCraft(recipeId);
    if (!started) {
      return false;
    }
    markAction(stepId);
    return true;
  }

  function runBuildStep(structureId, stepId) {
    if (playerHasPendingTask()) {
      return false;
    }
    if (!canPlaceStructure(structureId)) {
      return false;
    }

    const building = buildingById(structureId);
    const placed = placeStructure(structureId, {
      x: building?.x ?? 0,
      y: building?.y ?? 0,
    });
    if (!placed) {
      return false;
    }

    markAction(stepId);
    return true;
  }

  function runCompleteBuildStep(structureId, stepId) {
    if (playerHasPendingTask()) {
      return false;
    }
    const started = startPlayerConstruction(structureId);
    if (!started) {
      return false;
    }
    markAction(stepId);
    return true;
  }

  function runVillagerCountStep(targetCount, stepId) {
    if (villagers.length >= targetCount) {
      return false;
    }
    addVillager();
    markAction(stepId);
    return true;
  }

  function runAssignStep(stationId, stepId) {
    if (assignedVillagerList(stationId).length > 0) {
      return false;
    }
    const villager = unassignedVillagersForStation(stationId)[0];
    if (!villager) {
      return false;
    }
    addVillagerToStation(villager.id, stationId);
    markAction(stepId);
    return true;
  }

  function runStationEntryStep(stationId, recipeId, stepId) {
    const hasEntry = stationCraftEntries(stationId).some((entry) => entry.recipeId === recipeId);
    if (hasEntry) {
      return false;
    }
    const added = addStationCraftEntry(stationId, recipeId, 1);
    if (!added) {
      return false;
    }
    markAction(stepId);
    return true;
  }

  function runStockRuleStep(itemId, stepId) {
    const rule = stockRules.find((entry) => entry.itemId === itemId);
    if (!rule || rule.enabled) {
      return false;
    }
    rule.enabled = true;
    rule.target = Math.max(1, Number(rule.target) || 1);
    onRuleChanged(rule);
    markAction(stepId);
    return true;
  }

  function executeCurrentStep() {
    const step = currentTutorialStep.value;
    if (!step || isTutorialComplete.value) {
      return false;
    }

    if (isOnCooldown(step.id)) {
      return false;
    }

    if (runMissingRequirementGather(step)) {
      return true;
    }

    if (step.id.startsWith("gather-")) {
      return runGatherStep(step.id.slice("gather-".length), step.id);
    }
    if (step.id.startsWith("craft-")) {
      return runCraftStep(step.id.slice("craft-".length), step.id);
    }
    if (step.id.startsWith("build-")) {
      return runBuildStep(step.id.slice("build-".length), step.id);
    }
    if (step.id.startsWith("complete-")) {
      return runCompleteBuildStep(step.id.slice("complete-".length), step.id);
    }
    if (step.id.startsWith("villagers-")) {
      return runVillagerCountStep(Number(step.id.slice("villagers-".length)), step.id);
    }
    if (step.id.startsWith("assign-")) {
      return runAssignStep(step.id.slice("assign-".length), step.id);
    }
    if (step.id.startsWith("station-entry-")) {
      const payload = step.id.slice("station-entry-".length);
      const separatorIndex = payload.indexOf("-");
      if (separatorIndex < 0) {
        return false;
      }
      const stationId = payload.slice(0, separatorIndex);
      const recipeId = payload.slice(separatorIndex + 1);
      return runStationEntryStep(stationId, recipeId, step.id);
    }
    if (step.id.startsWith("stock-rule-")) {
      return runStockRuleStep(step.id.slice("stock-rule-".length), step.id);
    }

    return false;
  }

  function tick() {
    if (!enabled.value) {
      return;
    }
    executeCurrentStep();
  }

  onMounted(() => {
    intervalId = window.setInterval(tick, DEV_AUTOPLAY_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }
  });

  return {
    statusText,
    executeCurrentStep,
  };
}

function distanceBetween(a, b) {
  const dx = (a?.x ?? 0) - (b?.x ?? 0);
  const dy = (a?.y ?? 0) - (b?.y ?? 0);
  return Math.sqrt((dx * dx) + (dy * dy));
}
