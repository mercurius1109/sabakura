<template>
  <div v-if="selectedWindow" class="pointer-events-none absolute inset-0 z-20">
    <div
      class="pointer-events-auto absolute left-1/2 top-24 max-h-[calc(100vh-7rem)] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl bg-[#f2ead9]/58 shadow-[0_26px_60px_rgba(20,24,12,0.26)] backdrop-blur-xl"
      :class="selectedWindow.type === 'player' || selectedWindow.type === 'village' || selectedWindow.type === 'build'
        ? 'max-w-[26rem]'
        : ''"
    >
      <template v-if="selectedWindow.type === 'player'">
        <WindowHeader :title="t('ui.player')" :description="t('ui.playerStatusInspect')" @close="$emit('close-window')" />
        <PlayerActorPanel
          :item-cards="playerItemCards"
          :owned-kinds="playerOwnedKinds"
          :transfer-caption="playerTransferCaption"
          :transfer-disabled="playerTransferDisabled"
          :transfer-disabled-text="playerTransferDisabledText"
          :task="currentPlayerTask"
          :tasks="currentPlayerTasks"
          :task-label="taskLabel"
          :task-display-text="taskDisplayText"
          :task-progress="taskProgress"
          :remaining-seconds="remainingSeconds"
          :on-cancel-task="cancelTask"
          :is-busy="isPlayerBusy"
          :recipes="playerRecipes"
          :recipe-tooltip="playerCraftTooltip"
          :recipe-button-class="playerRecipeButtonClass"
          :recipe-icon="playerCraftIcon"
          :can-start-recipe="canStartPlayerRecipe"
          :is-craft-override-active="isCraftOverrideActive"
          :dev-craft-override-enabled="isDevMode"
          :show-craft-section="true"
          :item-actions-for-item="playerItemActions"
          @select-transfer="$emit('handle-player-transfer', $event)"
          @select-item-action="$emit('handle-player-item-action', $event)"
          @start-recipe="$emit('start-player-craft', $event)"
        />
      </template>

      <template v-else-if="selectedWindow.type === 'village'">
        <WindowHeader :title="t('ui.village')" :description="t('ui.villageInspect')" @close="$emit('close-window')" />
        <VillageWindow
          :villagers="villagers"
          :villager-stations-label="selectedVillagerStationsLabel"
          :highlight-add-villager="hasTutorialTarget('menu-action', 'add-villager')"
          :tutorial-highlight-class="tutorialHighlightClass"
          @add-villager="$emit('add-villager')"
          @select-villager="$emit('open-villager-compare-window', $event)"
        />
      </template>

      <template v-else-if="selectedWindow.type === 'build'">
        <WindowHeader :title="t('ui.build')" :description="t('ui.buildInspect')" @close="$emit('close-window')" />
        <BuildWindow
          :build-cards="playerBuildCards"
          :build-button-class="buildMenuButtonClass"
          :can-place-structure="canPlaceStructure"
          :is-build-override-active="isBuildOverrideActive"
          :dev-build-override-enabled="isDevMode"
          :format-list="formatList"
          :building-status="buildingStatus"
          :construction-sites="constructionSitesForField"
          @start-building="$emit('begin-building-placement', $event)"
          @cancel-construction="$emit('cancel-construction-site', $event)"
        />
      </template>

      <template v-else-if="selectedStationWindow">
        <WindowHeader
          :title="selectedStationWindow.station.name"
          :description="selectedStationWindow.station.description || t('ui.facilityInspect')"
          @close="$emit('close-window')"
        />
        <div class="grid max-h-[calc(100vh-12rem)] min-h-0 gap-0 overflow-hidden lg:grid-cols-2">
          <div class="min-h-0 border-b border-white/[0.04] lg:border-b-0 lg:border-r">
            <PlayerActorPanel
              :item-cards="playerItemCards"
              :owned-kinds="playerOwnedKinds"
              :transfer-caption="playerTransferCaption"
              :transfer-disabled="playerTransferDisabled"
              :transfer-disabled-text="playerTransferDisabledText"
              :task="currentPlayerTask"
              :tasks="currentPlayerTasks"
              :task-label="taskLabel"
              :task-display-text="taskDisplayText"
              :task-progress="taskProgress"
              :remaining-seconds="remainingSeconds"
              :on-cancel-task="cancelTask"
              :is-busy="isPlayerBusy"
              :recipes="selectedStationWindow.playerRecipes"
              :recipe-tooltip="playerCraftTooltip"
              :recipe-button-class="playerRecipeButtonClass"
              :recipe-icon="playerCraftIcon"
              :can-start-recipe="canStartPlayerRecipe"
              :is-craft-override-active="isCraftOverrideActive"
              :dev-craft-override-enabled="isDevMode"
              :show-craft-section="selectedStationWindow.playerRecipes.length > 0"
              :item-actions-for-item="playerItemActions"
              @select-transfer="$emit('handle-player-transfer', $event)"
              @select-item-action="$emit('handle-player-item-action', $event)"
              @start-recipe="$emit('start-player-craft', $event)"
            />
          </div>
          <StationWindow
            class="min-h-0"
            :station="selectedStationWindow.station"
            :is-available="selectedStationWindow.isAvailable"
            :assigned-villagers="selectedStationWindow.assignedVillagers"
            :available-villagers="selectedStationWindow.availableVillagers"
            :tasks="selectedStationWindow.tasks"
            :recipes="selectedStationWindow.recipes"
            :craft-entries="selectedStationWindow.craftEntries"
            :inventory-entries="selectedStationWindow.inventoryEntries"
            :current-amount="selectedStationWindow.currentAmount"
            :expected-amount="selectedStationWindow.expectedAmount"
            :craft-entry-status="selectedStationWindow.craftEntryStatus"
            :can-start-entry="selectedStationWindow.canStartEntry"
            :recipe-by-id="recipeById"
            :item-definitions="itemDefinitions"
            :station-name-by-id="stationName"
            :task-label="taskLabel"
            :task-display-text="taskDisplayText"
            :villager-name="villagerName"
            :task-progress="taskProgress"
            :remaining-seconds="remainingSeconds"
            :format-list="formatList"
            :highlight-add-villager="selectedStationWindow.highlightAddVillager"
            :highlight-add-craft="selectedStationWindow.highlightAddCraft"
            :is-player-adjacent="selectedStationWindow.isPlayerAdjacent"
            :current-fuel-item-id="selectedStationWindow.currentFuelItemId"
            :fuel-count="selectedStationWindow.fuelCount"
            :player-fuel-entries="selectedStationWindow.playerFuelEntries"
            :station-fuel-entries="selectedStationWindow.stationFuelEntries"
            :burn-remaining-ms="selectedStationWindow.burnRemainingMs"
            :burn-duration-ms="selectedStationWindow.burnDurationMs"
            @cancel-task="$emit('cancel-task', $event)"
            @add-villager="forwardAddVillagerToStation"
            @remove-villager="forwardRemoveVillagerFromStation"
            @add-craft-entry="forwardAddStationCraftEntry"
            @remove-craft-entry="forwardRemoveStationCraftEntry"
            @update-craft-entry-target="forwardUpdateStationCraftEntryTarget"
            @start-craft-entry="forwardStartStationCraftEntry"
            @transfer-fuel-to-station="forwardTransferStationFuelToStation"
            @transfer-fuel-to-player="forwardTransferStationFuelToPlayer"
            @transfer-item-to-player="forwardTransferStationItemToPlayer"
          />
        </div>
      </template>

      <template v-else-if="isStorageCompareWindow">
        <WindowHeader :title="storageTitle" :description="storageDescription" @close="$emit('close-window')" />
        <div class="grid max-h-[calc(100vh-12rem)] gap-0 overflow-hidden lg:grid-cols-2">
          <div class="border-b border-white/[0.04] lg:border-b-0 lg:border-r">
            <PlayerActorPanel
              :item-cards="playerItemCards"
              :owned-kinds="playerOwnedKinds"
              :transfer-caption="playerTransferCaption"
              :transfer-disabled="playerTransferDisabled"
              :transfer-disabled-text="playerTransferDisabledText"
              :task="currentPlayerTask"
              :tasks="currentPlayerTasks"
              :task-label="taskLabel"
              :task-display-text="taskDisplayText"
              :task-progress="taskProgress"
              :remaining-seconds="remainingSeconds"
              :on-cancel-task="cancelTask"
              :is-busy="isPlayerBusy"
              :recipes="playerRecipes"
              :recipe-tooltip="playerCraftTooltip"
              :recipe-button-class="playerRecipeButtonClass"
              :recipe-icon="playerCraftIcon"
              :can-start-recipe="canStartPlayerRecipe"
              :is-craft-override-active="isCraftOverrideActive"
              :dev-craft-override-enabled="isDevMode"
              :show-craft-section="false"
              :item-actions-for-item="playerItemActions"
              @select-transfer="$emit('handle-player-transfer', $event)"
              @select-item-action="$emit('handle-player-item-action', $event)"
            />
          </div>
          <StorageWindow
            :storage-transfer-entries="storageTransferEntries"
            :assigned-villagers="storageAssignedVillagers"
            :available-villagers="storageAvailableVillagers"
            :station-name-by-id="stationName"
            :is-player-adjacent-to-storage="isPlayerAdjacentToStorage"
            :registered-stock-rules="registeredStockRules"
            :stock-rule-tooltip="stockRuleTooltip"
            :tutorial-highlight-class="tutorialHighlightClass"
            :item-definitions="itemDefinitions"
            :inventory="inventory"
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
            :is-tutorial-target="(itemId) => hasTutorialTarget('stock-item', itemId)"
            @transfer-to-player="$emit('transfer-storage-item-to-player', $event)"
            @open-add-rule="$emit('open-add-stock-rule-modal')"
            @open-edit-rule="$emit('open-stock-rule-modal', $event)"
            @remove-rule="$emit('remove-stock-rule', $event)"
            @close-add-rule="$emit('close-add-stock-rule-modal')"
            @select-add-rule="$emit('set-draft-stock-rule-id', $event)"
            @update-add-target="$emit('set-draft-stock-rule-target', $event)"
            @submit-add-rule="$emit('submit-stock-rule-entry')"
            @close-edit-rule="$emit('close-stock-rule-modal')"
            @update-edit-target="$emit('set-editing-stock-rule-target', $event)"
            @submit-edit-rule="$emit('submit-stock-rule-edit')"
            @add-villager="forwardAddStorageVillager"
            @remove-villager="forwardRemoveStorageVillager"
          />
        </div>
      </template>

      <template v-else-if="isVillagerCompareWindow && selectedVillager">
        <WindowHeader :title="selectedVillager.name" :description="t('ui.villagerInspect')" @close="$emit('close-window')" />
        <div class="grid max-h-[calc(100vh-12rem)] gap-0 overflow-hidden lg:grid-cols-2">
          <div class="border-b border-white/[0.04] lg:border-b-0 lg:border-r">
            <PlayerActorPanel
              :item-cards="playerItemCards"
              :owned-kinds="playerOwnedKinds"
              :transfer-caption="playerTransferCaption"
              :transfer-disabled="playerTransferDisabled"
              :transfer-disabled-text="playerTransferDisabledText"
              :task="currentPlayerTask"
              :tasks="currentPlayerTasks"
              :task-label="taskLabel"
              :task-display-text="taskDisplayText"
              :task-progress="taskProgress"
              :remaining-seconds="remainingSeconds"
              :on-cancel-task="cancelTask"
              :is-busy="isPlayerBusy"
              :recipes="playerRecipes"
              :recipe-tooltip="playerCraftTooltip"
              :recipe-button-class="playerRecipeButtonClass"
              :recipe-icon="playerCraftIcon"
              :can-start-recipe="canStartPlayerRecipe"
              :is-craft-override-active="isCraftOverrideActive"
              :dev-craft-override-enabled="isDevMode"
              :show-craft-section="false"
              :item-actions-for-item="playerItemActions"
              @select-transfer="$emit('handle-player-transfer', $event)"
              @select-item-action="$emit('handle-player-item-action', $event)"
            />
          </div>
          <VillagerCompareWindow
            :transfer-entries="selectedVillagerTransferOutEntries"
            :is-player-adjacent="isPlayerAdjacentToSelectedVillager"
            :villager="selectedVillager"
            :stations="selectedVillagerStations"
            :task="currentSelectedVillagerTask"
            :tasks="currentSelectedVillagerTasks"
            :task-label="taskLabel"
            :task-display-text="taskDisplayText"
            :task-progress="taskProgress"
            :remaining-seconds="remainingSeconds"
            :on-cancel-task="cancelTask"
            @transfer-to-player="$emit('transfer-villager-item-to-player', $event)"
          />
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { provideWindowModalStack, useWindowModalStack } from "../composables/useWindowModalStack.js";
import BuildWindow from "./BuildWindow.vue";
import PlayerActorPanel from "./PlayerActorPanel.vue";
import StationWindow from "./StationWindow.vue";
import StorageWindow from "./StorageWindow.vue";
import VillagerCompareWindow from "./VillagerCompareWindow.vue";
import VillageWindow from "./VillageWindow.vue";
import WindowHeader from "./WindowHeader.vue";
import { useI18n } from "../i18n/index.js";

const props = defineProps({
  selectedWindow: { type: Object, default: null },
  isCompareWindow: { type: Boolean, required: true },
  isStorageCompareWindow: { type: Boolean, required: true },
  isVillagerCompareWindow: { type: Boolean, required: true },
  playerActor: { type: Object, required: true },
  playerItemCards: { type: Array, required: true },
  playerOwnedKinds: { type: Number, required: true },
  playerTransferCaption: { type: String, required: true },
  playerTransferDisabled: { type: Boolean, required: true },
  playerTransferDisabledText: { type: String, required: true },
  playerItemActions: { type: Function, required: true },
  currentPlayerTask: { type: Object, default: null },
  currentPlayerTasks: { type: Array, required: true },
  taskLabel: { type: Function, required: true },
  taskDisplayText: { type: Function, required: true },
  taskProgress: { type: Function, required: true },
  remainingSeconds: { type: Function, required: true },
  cancelTask: { type: Function, required: true },
  isPlayerBusy: { type: Boolean, required: true },
  playerRecipes: { type: Array, required: true },
  playerCraftTooltip: { type: Function, required: true },
  playerRecipeButtonClass: { type: Function, required: true },
  playerCraftIcon: { type: Function, required: true },
  canStartPlayerRecipe: { type: Function, required: true },
  isCraftOverrideActive: { type: Boolean, required: true },
  storageTitle: { type: String, required: true },
  storageTransferEntries: { type: Array, required: true },
  storageAssignedVillagers: { type: Array, required: true },
  storageAvailableVillagers: { type: Array, required: true },
  isPlayerAdjacentToStorage: { type: Boolean, required: true },
  registeredStockRules: { type: Array, required: true },
  stockRuleTooltip: { type: Function, required: true },
  tutorialHighlightClass: { type: String, required: true },
  itemDefinitions: { type: Object, required: true },
  inventory: { type: Object, required: true },
  showAddStockRuleModal: { type: Boolean, required: true },
  availableStockRules: { type: Array, required: true },
  draftStockRuleId: { type: String, default: null },
  draftStockRuleTarget: { type: Number, required: true },
  canSubmitStockRule: { type: Boolean, required: true },
  showEditStockRuleModal: { type: Boolean, required: true },
  editingStockRule: { type: Object, default: null },
  editingStockRuleTarget: { type: Number, required: true },
  expectedStock: { type: Function, required: true },
  stockRuleStatus: { type: Function, required: true },
  hasTutorialTarget: { type: Function, required: true },
  selectedVillager: { type: Object, default: null },
  selectedVillagerTransferOutEntries: { type: Array, required: true },
  isPlayerAdjacentToSelectedVillager: { type: Boolean, required: true },
  selectedVillagerStations: { type: Array, required: true },
  currentSelectedVillagerTask: { type: Object, default: null },
  currentSelectedVillagerTasks: { type: Array, required: true },
  playerBuildCards: { type: Array, required: true },
  playerBuildTooltip: { type: Function, required: true },
  playerBuildButtonClass: { type: Function, required: true },
  canPlaceStructure: { type: Function, required: true },
  isBuildOverrideActive: { type: Boolean, required: true },
  isDevMode: { type: Boolean, required: true },
  villagers: { type: Array, required: true },
  selectedVillagerStationsLabel: { type: Function, required: true },
  constructionSitesForField: { type: Array, required: true },
  buildMenuButtonClass: { type: Function, required: true },
  formatList: { type: Function, required: true },
  buildingStatus: { type: Function, required: true },
  selectedStationWindow: { type: Object, default: null },
  recipeById: { type: Function, required: true },
  stationName: { type: Function, required: true },
  villagerName: { type: Function, required: true },
});

const emit = defineEmits([
  "close-window",
  "handle-player-transfer",
  "handle-player-item-action",
  "start-player-craft",
  "transfer-storage-item-to-player",
  "open-add-stock-rule-modal",
  "open-stock-rule-modal",
  "remove-stock-rule",
  "close-add-stock-rule-modal",
  "set-draft-stock-rule-id",
  "set-draft-stock-rule-target",
  "submit-stock-rule-entry",
  "close-stock-rule-modal",
  "set-editing-stock-rule-target",
  "submit-stock-rule-edit",
  "add-storage-villager",
  "remove-storage-villager",
  "transfer-villager-item-to-player",
  "begin-building-placement",
  "add-villager",
  "open-villager-compare-window",
  "cancel-construction-site",
  "cancel-task",
  "add-villager-to-station",
  "remove-villager-from-station",
  "add-station-craft-entry",
  "remove-station-craft-entry",
  "update-station-craft-entry-target",
  "start-station-craft-entry",
  "transfer-station-fuel-to-station",
  "transfer-station-fuel-to-player",
  "transfer-station-item-to-player",
]);

const { t } = useI18n();
provideWindowModalStack(useWindowModalStack());

const storageDescription = computed(() =>
  props.storageTitle === t("ui.storage") ? t("ui.storageInspect") : t("ui.groundItemsInspect"),
);

function forwardAddVillagerToStation(villagerId, stationId) {
  emit("add-villager-to-station", villagerId, stationId);
}

function forwardRemoveVillagerFromStation(villagerId, stationId) {
  emit("remove-villager-from-station", villagerId, stationId);
}

function forwardAddStationCraftEntry(stationId, recipeId, target) {
  emit("add-station-craft-entry", stationId, recipeId, target);
}

function forwardRemoveStationCraftEntry(stationId, craftEntryId) {
  emit("remove-station-craft-entry", stationId, craftEntryId);
}

function forwardUpdateStationCraftEntryTarget(stationId, craftEntryId, target) {
  emit("update-station-craft-entry-target", stationId, craftEntryId, target);
}

function forwardStartStationCraftEntry(stationId, craftEntryId) {
  emit("start-station-craft-entry", stationId, craftEntryId);
}

function forwardAddStorageVillager(villagerId) {
  emit("add-storage-villager", villagerId);
}

function forwardRemoveStorageVillager(villagerId) {
  emit("remove-storage-villager", villagerId);
}

function forwardTransferStationItemToPlayer(stationId, itemId) {
  emit("transfer-station-item-to-player", stationId, itemId);
}

function forwardTransferStationFuelToStation(stationId, itemId) {
  emit("transfer-station-fuel-to-station", stationId, itemId);
}

function forwardTransferStationFuelToPlayer(stationId, itemId) {
  emit("transfer-station-fuel-to-player", stationId, itemId);
}
</script>
