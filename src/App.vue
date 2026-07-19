<template>
  <div class="h-screen overflow-hidden">
    <main class="h-full">
      <section class="relative h-full">
        <GameField
          :resource-nodes="displayFieldNodes()"
          :player="playerActor"
          :villagers="villagers"
          :construction-sites="constructionSitesForField"
          :placed-structure-nodes="placedStructureNodes"
          :item-definitions="itemDefinitions"
          :current-player-task-entries="playerTaskQueueEntries"
          :villager-task-entry-map="villagerTaskEntryMap"
          :inventory-fly-requests="inventoryFlyRequests"
          :field-transfer-fly-requests="fieldTransferFlyRequests"
          :current-time="displayNow"
          :task-label="taskLabel"
          :task-display-text="fieldTaskText"
          :world-width="worldWidth"
          :world-height="worldHeight"
          :pending-placement="pendingBuildingPlacement"
          :tutorial-targets="currentTutorialTargets"
          @field-click="handleFieldClick"
          @select-resource="pickupResourceNode"
          @select-structure="openStructureWindow"
          @select-storage="openStorageCompareWindow"
          @select-construction="handleConstructionSiteClick"
          @select-player="openPlayerWindow"
          @select-villager="openVillagerCompareWindow"
        />

        <FieldHud
          :highlight-inventory="hasTutorialTarget('menu', 'inventory')"
          :highlight-village="hasTutorialTarget('menu', 'village')"
          :highlight-build="hasTutorialTarget('menu', 'build')"
          :tutorial-highlight-class="tutorialHighlightClass"
          :game-speed-options="gameSpeedOptions"
          :game-speed="gameSpeed"
          :is-tutorial-dismissed="isTutorialDismissed"
          :current-tutorial-step="currentTutorialStep"
          :completed-tutorial-steps="completedTutorialSteps"
          :total-tutorial-steps="totalTutorialSteps"
          :is-tutorial-complete="isTutorialComplete"
          :pending-building-placement="pendingBuildingPlacement"
          :is-log-window-visible="isLogWindowVisible"
          :log="log"
          :minimap-construction-sites="constructionSitesForField"
          :minimap-player="playerActor"
          :minimap-structures="placedStructureNodes"
          :minimap-villagers="villagers"
          :player-fullness="Math.round(playerActor.fullness)"
          :player-max-fullness="playerActor.maxFullness"
          :player-fullness-percent="actorFullnessPercent(playerActor)"
          :player-is-starving="actorIsStarving(playerActor)"
          :show-dev-tools="isDevMode"
          :dev-autoplay-enabled="devTutorialAutoplayEnabled"
          :world-width="worldWidth"
          :world-height="worldHeight"
          @open-inventory="openPlayerWindow"
          @open-village="openVillageWindow"
          @open-build="openBuildWindow"
          @toggle-log="toggleLogWindow"
          @set-speed="setGameSpeed"
          @dismiss-tutorial="dismissTutorial"
          @cancel-pending="cancelPendingBuildingPlacement"
          @clear-log="clearLog"
          @click-fullness="handleDevFullnessClick"
          @toggle-dev-autoplay="devTutorialAutoplayEnabled = !devTutorialAutoplayEnabled"
          @run-dev-step="executeDevTutorialStep"
        />

        <GameWindows
          :selected-window="selectedWindow"
          :is-compare-window="isCompareWindow"
          :is-storage-compare-window="isStorageCompareWindow"
          :is-villager-compare-window="isVillagerCompareWindow"
          :player-actor="playerActor"
          :player-item-cards="playerItemCards"
          :player-owned-kinds="playerOwnedKinds"
          :player-transfer-caption="playerTransferCaption"
          :player-transfer-disabled="playerTransferDisabled"
          :player-transfer-disabled-text="playerTransferDisabledText"
          :player-item-actions="playerItemActions"
          :current-player-task="currentPlayerTask"
          :current-player-tasks="playerTaskList"
          :task-label="taskLabel"
          :task-display-text="fieldTaskText"
          :task-progress="taskProgress"
          :remaining-seconds="remainingSeconds"
          :cancel-task="cancelTask"
          :is-player-busy="isPlayerBusy"
          :player-recipes="playerRecipes"
          :player-craft-tooltip="playerCraftTooltip"
          :player-recipe-button-class="playerRecipeButtonClass"
          :player-craft-icon="playerCraftIcon"
          :can-start-player-recipe="canStartPlayerRecipe"
          :is-craft-override-active="isBuildOverrideActive"
          :storage-title="storageTitle"
          :storage-transfer-entries="storageTransferEntries"
          :storage-assigned-villagers="storageAssignedVillagers"
          :storage-available-villagers="storageAvailableVillagers"
          :is-player-adjacent-to-storage="isPlayerAdjacentToStorage"
          :registered-stock-rules="registeredStockRules"
          :stock-rule-tooltip="stockRuleTooltip"
          :tutorial-highlight-class="tutorialHighlightClass"
          :item-definitions="itemDefinitions"
          :inventory="resolvedInventory"
          :show-add-stock-rule-modal="showAddStockRuleModal"
          :available-stock-rules="availableStockRules"
          :draft-stock-rule-id="draftStockRuleId"
          :draft-stock-rule-target="draftStockRuleTarget"
          :can-submit-stock-rule="canSubmitStockRule"
          :show-edit-stock-rule-modal="showEditStockRuleModal"
          :editing-stock-rule="editingStockRule"
          :editing-stock-rule-target="editingStockRuleTarget"
          :expected-stock="expectedStock"
          :stock-rule-status="stockRuleStatus"
          :has-tutorial-target="hasTutorialTarget"
          :selected-villager="selectedVillager"
          :selected-villager-transfer-out-entries="selectedVillagerTransferOutEntries"
          :is-player-adjacent-to-selected-villager="isPlayerAdjacentToSelectedVillager"
          :selected-villager-stations="selectedVillagerStations"
          :current-selected-villager-task="currentSelectedVillagerTask"
          :current-selected-villager-tasks="selectedVillagerTaskList"
          :player-build-cards="playerBuildCards"
          :player-build-tooltip="playerBuildTooltip"
          :player-build-button-class="playerBuildButtonClass"
          :can-place-structure="canPlaceStructure"
          :is-build-override-active="isBuildOverrideActive"
          :is-dev-mode="isDevMode"
          :villagers="villagers"
          :selected-villager-stations-label="selectedVillagerStationsLabel"
          :construction-sites-for-field="constructionSitesForField"
          :build-menu-button-class="buildMenuButtonClass"
          :format-list="formatList"
          :building-status="buildingStatus"
          :selected-station-window="selectedStationWindow"
          :recipe-by-id="recipeById"
          :station-name="stationName"
          :villager-name="villagerName"
          @close-window="closeWindow"
          @handle-player-transfer="handlePlayerTransfer"
          @handle-player-item-action="handlePlayerItemAction"
          @start-player-craft="startPlayerCraft"
          @transfer-storage-item-to-player="transferStorageItemToPlayer"
          @transfer-station-item-to-player="handleStationItemToPlayer"
          @open-add-stock-rule-modal="openAddStockRuleModal"
          @open-stock-rule-modal="openStockRuleModal"
          @remove-stock-rule="removeStockRule"
          @close-add-stock-rule-modal="closeAddStockRuleModal"
          @set-draft-stock-rule-id="draftStockRuleId = $event"
          @set-draft-stock-rule-target="draftStockRuleTarget = $event"
          @submit-stock-rule-entry="submitStockRuleEntry"
          @close-stock-rule-modal="closeStockRuleModal"
          @set-editing-stock-rule-target="editingStockRuleTarget = $event"
          @submit-stock-rule-edit="submitStockRuleEdit"
          @add-storage-villager="addVillagerToStation($event, 'storage')"
          @remove-storage-villager="removeVillagerFromStation($event, 'storage')"
          @transfer-villager-item-to-player="transferVillagerItemToPlayer"
          @begin-building-placement="beginBuildingPlacement"
          @add-villager="addVillager"
          @open-villager-compare-window="openVillagerCompareWindow"
          @cancel-construction-site="cancelConstructionSite"
          @cancel-task="cancelTask"
          @add-villager-to-station="addVillagerToStation"
          @remove-villager-from-station="removeVillagerFromStation"
          @add-station-craft-entry="addStationCraftEntry"
          @remove-station-craft-entry="removeStationCraftEntry"
          @update-station-craft-entry-target="updateStationCraftEntryTarget"
          @start-station-craft-entry="startStationCraftEntry"
          @transfer-station-fuel-to-station="transferStationFuelToStation"
          @transfer-station-fuel-to-player="transferStationFuelToPlayer"
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watchEffect } from "vue";
import FieldHud from "./components/FieldHud.vue";
import GameField from "./components/GameField.vue";
import GameWindows from "./components/GameWindows.vue";
import { useAppInteractions } from "./composables/useAppInteractions.js";
import { useDevTutorialAutoplay } from "./composables/useDevTutorialAutoplay.js";
import { useAppShellState } from "./composables/useAppShellState.js";
import { useGameWindowsState } from "./composables/useGameWindowsState.js";
import { useSurvivalCraft } from "./composables/useSurvivalCraft.js";
import { useTutorial } from "./composables/useTutorial.js";

const selectedWindow = ref(null);
const isTutorialDismissed = ref(false);
const isLogWindowVisible = ref(true);
const pendingBuildingPlacementId = ref(null);
const editingStockRuleId = ref(null);
const editingStockRuleTarget = ref(0);
const showAddStockRuleModal = ref(false);
const draftStockRuleId = ref(null);
const draftStockRuleTarget = ref(1);
const isDevMode = import.meta.env.DEV;
const devTutorialAutoplayEnabled = ref(false);
const isBuildOverrideActive = ref(false);
const pendingBuildOverridePlacement = ref(false);

const {
  itemDefinitions,
  buildingDefinitions,
  inventory,
  storage,
  stationContainers,
  stationFuelState,
  placedStructures,
  constructionSites,
  constructionQueue,
  craftQueue,
  gatherQueue,
  gatherActions,
  playerActor,
  inventoryFlyRequests,
  fieldTransferFlyRequests,
  displayFieldNodes,
  visibleFieldNodes,
  pickupFieldNode,
  placeStructure,
  cancelConstructionSite,
  canPlaceStructure,
  canStartPlayerRecipe,
  buildingStatus,
  villagers,
  playerRecipes,
  isPlayerBusy,
  log,
  stockRules,
  expectedStock,
  isStationAvailable,
  stationHasFuel,
  assignedVillagerList,
  unassignedVillagersForStation,
  stationTasks,
  stationRecipes,
  stationCraftEntries,
  canStartStationCraftEntry,
  addStationCraftEntry,
  removeStationCraftEntry,
  updateStationCraftEntryTarget,
  stationTargetItemId,
  craftEntryStatus,
  addVillagerToStation,
  removeVillagerFromStation,
  addVillager,
  onRuleChanged,
  startPlayerCraft: startPlayerCraftTask,
  startPlayerConstruction,
  startStationCraftEntry,
  recipeById,
  buildingById,
  taskLabel,
  taskPhaseLabel,
  stationName,
  villagerName,
  findTaskById,
  taskProgress,
  displayNow,
  remainingSeconds,
  gameSpeed,
  setGameSpeed,
  isPlayerAdjacentToStorage,
  isPlayerAdjacentToActor,
  isPlayerAdjacentToStructure,
  approachStructureTarget,
  approachTransferTarget,
  movePlayerTo,
  moveItemFromActorToStorage,
  moveItemFromStorageToActor,
  moveItemFromActorToStation,
  moveItemFromStationToActor,
  moveItemFromActorToActor,
  moveItemFromOtherActorToPlayer,
  dropPlayerItem,
  eatPlayerItem,
  restorePlayerFullness,
  cancelTask,
  clearLog,
  addLog,
  formatList,
  stockRuleStatus,
  actorFullnessPercent,
  actorIsStarving,
  stations,
  worldWidth,
  worldHeight,
} = useSurvivalCraft({
  preventPlayerFullnessDecay: devTutorialAutoplayEnabled,
});

function formatDevError(error) {
  if (!error) {
    return "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function handleWindowError(event) {
  const details = event?.error || event?.message || event;
  addLog(`[DEV] JS error: ${formatDevError(details)}`);
}

function handleUnhandledRejection(event) {
  addLog(`[DEV] Promise rejection: ${formatDevError(event?.reason)}`);
}

function handleDevModifierKey(event) {
  if (!isDevMode || event.key !== "Alt") {
    return;
  }
  isBuildOverrideActive.value = event.type === "keydown";
}

onMounted(() => {
  if (!isDevMode) {
    return;
  }
  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  window.addEventListener("keydown", handleDevModifierKey);
  window.addEventListener("keyup", handleDevModifierKey);
  window.addEventListener("blur", clearDevBuildOverride);
});

onUnmounted(() => {
  if (!isDevMode) {
    return;
  }
  window.removeEventListener("error", handleWindowError);
  window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  window.removeEventListener("keydown", handleDevModifierKey);
  window.removeEventListener("keyup", handleDevModifierKey);
  window.removeEventListener("blur", clearDevBuildOverride);
});

function clearDevBuildOverride() {
  isBuildOverrideActive.value = false;
}

function handleDevFullnessClick(event) {
  if (!isDevMode || !event?.altKey) {
    return;
  }
  restorePlayerFullness();
}

function canPlaceStructureForUi(structureId) {
  return isBuildOverrideActive.value || canPlaceStructure(structureId);
}

function startPlayerCraft(payload) {
  if (typeof payload === "string") {
    return startPlayerCraftTask(payload);
  }
  if (!payload?.recipeId) {
    return false;
  }
  return startPlayerCraftTask(payload.recipeId, { ignoreRequirements: Boolean(payload.ignoreRequirements) });
}

const {
  currentStep: currentTutorialStep,
  completedCount: completedTutorialSteps,
  totalSteps: totalTutorialSteps,
  isTutorialComplete,
} = useTutorial({
  playerActor,
  villagers,
  placedStructures,
  constructionSites,
  visibleFieldNodes,
  recipeById,
  buildingById,
  stationById: (stationId) => stations.find((station) => station.id === stationId) || null,
  assignedVillagerList,
  stationCraftEntries,
  stockRules,
  itemDefinitions,
});

const {
  gameSpeedOptions,
  tutorialHighlightClass,
  currentTutorialTargets,
  dismissTutorial,
  toggleLogWindow,
  constructionSitesForField,
  placedStructureNodes,
} = useAppShellState({
  isTutorialDismissed,
  isLogWindowVisible,
  isTutorialComplete,
  currentTutorialStep,
  constructionSites,
  constructionQueue,
  taskProgress,
  placedStructures,
  buildingById,
  itemDefinitions,
});

const {
  isCompareWindow,
  isStorageCompareWindow,
  isVillagerCompareWindow,
  selectedVillager,
  playerItemCards,
  playerOwnedKinds,
  storageTransferEntries,
  storageAssignedVillagers,
  storageAvailableVillagers,
  selectedVillagerTransferOutEntries,
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
  hasTutorialTarget,
} = useGameWindowsState({
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
  canPlaceStructure: canPlaceStructureForUi,
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
  stationHasFuel,
  stationContainers,
  stationFuelState,
  isPlayerAdjacentToStructure,
  formatList,
  findTaskById,
});

const {
  transferStorageItemToPlayer,
  transferStationItemToPlayer,
  transferVillagerItemToPlayer,
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
} = useAppInteractions({
  selectedWindow,
  pendingBuildingPlacementId,
  pendingBuildOverridePlacement,
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
});

const { executeCurrentStep: executeDevTutorialStep } = useDevTutorialAutoplay({
  enabled: devTutorialAutoplayEnabled,
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
});

function taskForActor(actorId) {
  const actor = actorId === playerActor.id
    ? playerActor
    : villagers.find((villager) => villager.id === actorId);
  const currentTask = actor?.currentTaskId ? findTaskById(actor.currentTaskId) : null;
  if (currentTask) {
    return currentTask;
  }
  if (actor?.taskQueue?.length) {
    const queuedTask = findTaskById(actor.taskQueue[0]);
    if (queuedTask) {
      return queuedTask;
    }
  }
  return gatherQueue.find((task) => task.villagerId === actorId)
    || craftQueue.find((task) => task.villagerId === actorId)
    || constructionQueue.find((task) => task.villagerId === actorId)
    || null;
}

function tasksForActor(actorId) {
  const actor = actorId === playerActor.id
    ? playerActor
    : villagers.find((villager) => villager.id === actorId);
  if (!actor) {
    return [];
  }

  const queueTaskIds = Array.isArray(actor.taskQueue) ? actor.taskQueue : [];
  const queueTasks = queueTaskIds
    .map((taskId) => findTaskById(taskId))
    .filter(Boolean);

  if (queueTasks.length > 0) {
    return queueTasks;
  }

  const fallbackTask = taskForActor(actorId);
  return fallbackTask ? [fallbackTask] : [];
}

function fieldTaskText(task) {
  if (!task) {
    return "";
  }
  if (task.kind === "move") {
    return taskPhaseLabel(task);
  }
  return taskLabel(task);
}

function queuedTaskText(task) {
  if (!task) {
    return "";
  }
  return taskLabel(task);
}

function actorForTask(task) {
  if (!task) {
    return null;
  }
  return task.villagerId === playerActor.id
    ? playerActor
    : villagers.find((villager) => villager.id === task.villagerId) || null;
}

function movingFieldTaskProgress(task) {
  const actor = actorForTask(task);
  if (!actor) {
    return 0;
  }

  const currentPosition = {
    x: Number.isFinite(actor.renderX) ? actor.renderX : actor.x,
    y: Number.isFinite(actor.renderY) ? actor.renderY : actor.y,
  };
  return taskProgress(task, currentPosition);
}

function fieldTaskProgress(task) {
  if (!task) {
    return null;
  }
  if (task.kind === "move") {
    return movingFieldTaskProgress(task);
  }
  if (!task.workStartedAt) {
    return 0;
  }

  const baseElapsed = Number.isFinite(task.workElapsedMs) ? task.workElapsedMs : 0;
  const canInterpolate = !(task.kind === "craft" && task.station === "cookingStation");
  const interpolatedElapsed = canInterpolate
    ? baseElapsed + Math.max(0, displayNow.value - (task.workStartedAt + baseElapsed))
    : baseElapsed;

  return Math.max(0, Math.min(100, (interpolatedElapsed / task.duration) * 100));
}

function taskQueueEntries(actorId) {
  const tasks = tasksForActor(actorId);
  if (tasks.length === 0) {
    return [];
  }

  const entries = tasks
    .map((task, index) => {
      const text = index === 0 ? fieldTaskText(task) : queuedTaskText(task);
      if (!text) {
        return null;
      }
      const progress = fieldTaskProgress(task);
      return {
        key: `${task.id}:${index}`,
        text,
        progress: progress > 0 ? progress : null,
      };
    })
    .filter(Boolean);

  return entries;
}

const playerTaskList = computed(() => tasksForActor(playerActor.id));

const fieldTaskCache = reactive({});

function isActorRenderSettled(actor) {
  if (!actor) {
    return true;
  }
  const renderX = Number.isFinite(actor.renderX) ? actor.renderX : actor.x;
  const renderY = Number.isFinite(actor.renderY) ? actor.renderY : actor.y;
  return Math.hypot(actor.x - renderX, actor.y - renderY) <= 0.5;
}

function isMovingTask(task) {
  return task?.kind === "move";
}

watchEffect(() => {
  const activeActorIds = new Set([playerActor.id, ...villagers.map((villager) => villager.id)]);

  Object.keys(fieldTaskCache).forEach((actorId) => {
    if (!activeActorIds.has(actorId)) {
      delete fieldTaskCache[actorId];
    }
  });

  [playerActor, ...villagers].forEach((actor) => {
    const tasks = tasksForActor(actor.id);
    const cachedTasks = fieldTaskCache[actor.id];
    const cachedLeadTask = Array.isArray(cachedTasks) ? cachedTasks[0] : null;
    const nextLeadTask = tasks[0] || null;

    if (
      cachedLeadTask
      && !nextLeadTask
      && isMovingTask(cachedLeadTask)
      && !isActorRenderSettled(actor)
    ) {
      return;
    }

    if (tasks.length > 0) {
      fieldTaskCache[actor.id] = [...tasks];
      return;
    }

    if (isActorRenderSettled(actor)) {
      delete fieldTaskCache[actor.id];
    }
  });
});

function cachedTaskQueueEntries(actorId) {
  const tasks = fieldTaskCache[actorId];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  return tasks
    .map((task, index) => {
      const text = index === 0 ? fieldTaskText(task) : queuedTaskText(task);
      if (!text) {
        return null;
      }
      const progress = fieldTaskProgress(task);
      return {
        key: `${task.id}:${index}`,
        text,
        progress: progress > 0 ? progress : null,
      };
    })
    .filter(Boolean);
}

const playerTaskQueueEntries = computed(() => cachedTaskQueueEntries(playerActor.id));

const villagerTaskEntryMap = computed(() => Object.fromEntries(
  villagers.map((villager) => [villager.id, cachedTaskQueueEntries(villager.id)]),
));

const selectedVillagerTaskList = computed(() => (
  selectedVillager.value ? tasksForActor(selectedVillager.value.id) : []
));

function transferStationFuelToStation(stationId, itemId) {
  if (!itemId) {
    return;
  }
  moveItemFromActorToStation(playerActor, stationId, itemId, 1);
}

function transferStationFuelToPlayer(stationId, itemId) {
  if (!itemId) {
    return;
  }
  moveItemFromStationToActor(playerActor, stationId, itemId, 1);
}

function handleStationItemToPlayer(stationId, itemId) {
  if (!stationId || !itemId) {
    return;
  }
  moveItemFromStationToActor(playerActor, stationId, itemId, 1);
}
</script>


