<template>
  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <InventoryActionGrid
      :caption="t('ui.villagerInventory')"
      :empty-text="t('common.carryingNone')"
      :entries="transferEntries"
      :disabled="!isPlayerAdjacent"
      :disabled-text="t('ui.moveNextToVillager')"
      @select="$emit('transfer-to-player', $event)"
    />

    <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
      <div class="text-sm font-bold text-ink">{{ t("ui.assignedStations") }}</div>
      <div v-if="stations.length === 0" class="mt-3 text-sm text-muted">{{ t("ui.noAssignedStations") }}</div>
      <div v-else class="mt-3 grid gap-2">
        <div
          v-for="station in stations"
          :key="station.id"
          class="rounded-xl border border-line bg-[#faf8f3] px-3 py-3 text-sm font-bold text-ink"
        >
          {{ station.name }}
        </div>
      </div>
    </div>

    <TaskPanel
      class="mt-4"
      :task="task"
      :tasks="tasks"
      :task-label="taskLabel"
      :task-display-text="taskDisplayText"
      :task-progress="taskProgress"
      :remaining-seconds="remainingSeconds"
      :on-cancel="onCancelTask"
    />
  </div>
</template>

<script setup>
import InventoryActionGrid from "./InventoryActionGrid.vue";
import TaskPanel from "./TaskPanel.vue";
import { useI18n } from "../i18n/index.js";

defineProps({
  transferEntries: { type: Array, required: true },
  isPlayerAdjacent: { type: Boolean, required: true },
  stations: { type: Array, required: true },
  task: { type: Object, default: null },
  tasks: { type: Array, default: () => [] },
  taskLabel: { type: Function, required: true },
  taskDisplayText: { type: Function, required: true },
  taskProgress: { type: Function, required: true },
  remainingSeconds: { type: Function, required: true },
  onCancelTask: { type: Function, default: null },
});

defineEmits(["transfer-to-player"]);

const { t } = useI18n();
</script>
