<template>
  <div class="h-screen overflow-hidden">
    <main class="h-full">
      <section class="relative h-full">
        <GameField
          :resource-nodes="visibleFieldNodes()"
          :player="playerActor"
          :villagers="villagers"
          :construction-sites="constructionSitesForField"
          :placed-structure-nodes="placedStructureNodes"
          :item-definitions="itemDefinitions"
          :pending-placement="pendingBuildingPlacement"
          :tutorial-targets="currentTutorialTargets"
          @field-click="handleFieldClick"
          @select-resource="pickupResourceNode"
          @select-workbench="openWorkbenchWindow"
          @select-lumberjack-hut="openLumberjackHutWindow"
          @select-storage="openStorageCompareWindow"
          @select-construction="handleConstructionSiteClick"
          @select-player="openPlayerWindow"
          @select-villager="openVillagerCompareWindow"
        />

        <FieldHud
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
          @open-village="openVillageWindow"
          @open-build="openBuildWindow"
          @toggle-log="toggleLogWindow"
          @set-speed="setGameSpeed"
          @dismiss-tutorial="dismissTutorial"
          @cancel-pending="cancelPendingBuildingPlacement"
          @clear-log="clearLog"
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
          :current-player-task="currentPlayerTask"
          :task-label="taskLabel"
          :task-progress="taskProgress"
          :remaining-seconds="remainingSeconds"
          :cancel-task="cancelTask"
          :is-player-busy="isPlayerBusy"
          :player-recipes="playerRecipes"
          :player-craft-tooltip="playerCraftTooltip"
          :player-recipe-button-class="playerRecipeButtonClass"
          :player-craft-icon="playerCraftIcon"
          :can-start-player-recipe="canStartPlayerRecipe"
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
          :player-build-cards="playerBuildCards"
          :player-build-tooltip="playerBuildTooltip"
          :player-build-button-class="playerBuildButtonClass"
          :can-place-structure="canPlaceStructure"
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
          @start-player-craft="startPlayerCraft"
          @transfer-storage-item-to-player="transferStorageItemToPlayer"
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
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from "vue";
import FieldHud from "./components/FieldHud.vue";
import GameField from "./components/GameField.vue";
import GameWindows from "./components/GameWindows.vue";
import { useAppInteractions } from "./composables/useAppInteractions.js";
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

const {
  itemDefinitions,
  inventory,
  storage,
  placedStructures,
  constructionSites,
  constructionQueue,
  craftQueue,
  gatherQueue,
  gatherActions,
  playerActor,
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
  startPlayerCraft,
  startPlayerConstruction,
  startStationCraftEntry,
  recipeById,
  buildingById,
  taskLabel,
  stationName,
  villagerName,
  taskProgress,
  remainingSeconds,
  gameSpeed,
  setGameSpeed,
  isPlayerAdjacentToStorage,
  isPlayerAdjacentToActor,
  approachTransferTarget,
  movePlayerTo,
  moveItemFromActorToStorage,
  moveItemFromStorageToActor,
  moveItemFromActorToActor,
  moveItemFromOtherActorToPlayer,
  dropPlayerItem,
  cancelTask,
  clearLog,
  formatList,
  stockRuleStatus,
  stations,
} = useSurvivalCraft();

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
});

const {
  transferStorageItemToPlayer,
  transferVillagerItemToPlayer,
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
} = useAppInteractions({
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
});
</script>


