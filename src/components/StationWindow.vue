<template>
  <div class="max-h-[calc(100vh-10rem)] min-h-0 overflow-y-auto px-4 py-4">
    <StationCard
      :station="station"
      :is-available="isAvailable"
      :assigned-villagers="assignedVillagers"
      :available-villagers="availableVillagers"
      :tasks="tasks"
      :recipes="recipes"
      :craft-entries="craftEntries"
      :inventory-entries="inventoryEntries"
      :current-amount="currentAmount"
      :expected-amount="expectedAmount"
      :craft-entry-status="craftEntryStatus"
      :can-start-entry="canStartEntry"
      :recipe-by-id="recipeById"
      :item-definitions="itemDefinitions"
      :station-name-by-id="stationNameById"
      :task-label="taskLabel"
      :task-display-text="taskDisplayText"
      :villager-name="villagerName"
      :task-progress="taskProgress"
      :remaining-seconds="remainingSeconds"
      :format-list="formatList"
      :highlight-add-villager="highlightAddVillager"
      :highlight-add-craft="highlightAddCraft"
      :is-player-adjacent="isPlayerAdjacent"
      :current-fuel-item-id="currentFuelItemId"
      :fuel-count="fuelCount"
      :player-fuel-entries="playerFuelEntries"
      :station-fuel-entries="stationFuelEntries"
      :burn-remaining-ms="burnRemainingMs"
      :burn-duration-ms="burnDurationMs"
      @cancel-task="$emit('cancel-task', $event)"
      @add-villager="forwardAddVillager"
      @remove-villager="forwardRemoveVillager"
      @add-craft-entry="forwardAddCraftEntry"
      @remove-craft-entry="forwardRemoveCraftEntry"
      @update-craft-entry-target="forwardUpdateCraftEntryTarget"
      @start-craft-entry="forwardStartCraftEntry"
      @transfer-fuel-to-station="forwardTransferFuelToStation"
      @transfer-fuel-to-player="forwardTransferFuelToPlayer"
      @transfer-item-to-player="forwardTransferItemToPlayer"
    />
  </div>
</template>

<script setup>
import StationCard from "./StationCard.vue";

defineProps({
  station: { type: Object, required: true },
  isAvailable: { type: Boolean, required: true },
  assignedVillagers: { type: Array, required: true },
  availableVillagers: { type: Array, required: true },
  tasks: { type: Array, required: true },
  recipes: { type: Array, required: true },
  craftEntries: { type: Array, required: true },
  inventoryEntries: { type: Array, required: true },
  currentAmount: { type: Function, required: true },
  expectedAmount: { type: Function, required: true },
  craftEntryStatus: { type: Function, required: true },
  canStartEntry: { type: Function, required: true },
  recipeById: { type: Function, required: true },
  itemDefinitions: { type: Object, required: true },
  stationNameById: { type: Function, required: true },
  taskLabel: { type: Function, required: true },
  taskDisplayText: { type: Function, required: true },
  villagerName: { type: Function, required: true },
  taskProgress: { type: Function, required: true },
  remainingSeconds: { type: Function, required: true },
  formatList: { type: Function, required: true },
  highlightAddVillager: { type: Boolean, default: false },
  highlightAddCraft: { type: Boolean, default: false },
  isPlayerAdjacent: { type: Boolean, default: false },
  currentFuelItemId: { type: String, default: null },
  fuelCount: { type: Number, default: 0 },
  playerFuelEntries: { type: Array, required: true },
  stationFuelEntries: { type: Array, required: true },
  burnRemainingMs: { type: Number, default: 0 },
  burnDurationMs: { type: Number, default: 0 },
});

const emit = defineEmits([
  "cancel-task",
  "add-villager",
  "remove-villager",
  "add-craft-entry",
  "remove-craft-entry",
  "update-craft-entry-target",
  "start-craft-entry",
  "transfer-fuel-to-station",
  "transfer-fuel-to-player",
  "transfer-item-to-player",
]);

function forwardAddVillager(villagerId, stationId) {
  emit("add-villager", villagerId, stationId);
}

function forwardRemoveVillager(villagerId, stationId) {
  emit("remove-villager", villagerId, stationId);
}

function forwardAddCraftEntry(stationId, recipeId, target) {
  emit("add-craft-entry", stationId, recipeId, target);
}

function forwardRemoveCraftEntry(stationId, craftEntryId) {
  emit("remove-craft-entry", stationId, craftEntryId);
}

function forwardUpdateCraftEntryTarget(stationId, craftEntryId, target) {
  emit("update-craft-entry-target", stationId, craftEntryId, target);
}

function forwardStartCraftEntry(stationId, craftEntryId) {
  emit("start-craft-entry", stationId, craftEntryId);
}

function forwardTransferItemToPlayer(stationId, itemId) {
  emit("transfer-item-to-player", stationId, itemId);
}

function forwardTransferFuelToStation(stationId, itemId) {
  emit("transfer-fuel-to-station", stationId, itemId);
}

function forwardTransferFuelToPlayer(stationId, itemId) {
  emit("transfer-fuel-to-player", stationId, itemId);
}
</script>
