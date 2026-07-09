<template>
  <div
    class="relative rounded-md border border-line bg-[#fffdf8] p-3 transition-opacity"
    :class="isAvailable ? 'opacity-100' : 'opacity-55'"
  >
    <div class="flex items-center justify-between gap-2 font-bold">
      <span>{{ station.name }}</span>
      <span class="rounded-full px-3 py-1 text-xs font-bold" :class="isAvailable ? 'bg-emerald-100 text-moss' : 'bg-orange-100 text-ambered'">
        {{ isAvailable ? t("ui.available") : t("ui.unavailable") }}
      </span>
    </div>

    <p class="mt-2 text-sm leading-6 text-muted">{{ station.description }}</p>

    <div class="mt-3 rounded-md border border-line bg-white p-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold">{{ t("ui.assignVillager") }}</h3>
        <button
          type="button"
          class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
          :class="highlightAddVillager ? 'scale-105 ring-4 ring-[#f3c84b] ring-offset-2 ring-offset-white shadow-[0_0_24px_rgba(243,200,75,0.85)]' : ''"
          :disabled="!isAvailable"
          @click="showVillagerModal = true"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="assignedVillagers.length === 0" class="mt-2 text-sm text-muted">
        {{ t("ui.noAssignedStations") }}
      </div>

      <div v-for="villager in assignedVillagers" :key="villager.id" class="mt-2 flex items-center justify-between gap-2 rounded-md border border-line bg-[#fffdf8] px-3 py-2">
        <div>
          <div class="text-sm font-bold">{{ villager.name }}</div>
          <div class="text-xs text-muted">{{ villager.taskId ? t("ui.busy") : t("ui.idle") }}</div>
        </div>
        <button
          type="button"
          class="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-ambered transition hover:bg-ambered hover:text-white"
          :disabled="villager.taskId"
          @click="$emit('remove-villager', villager.id, station.id)"
        >
          {{ t("ui.remove") }}
        </button>
      </div>
    </div>

    <div v-if="recipes.length > 0 || craftEntries.length > 0" class="mt-3 rounded-md border border-line bg-white p-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold">{{ t("ui.craftEntries") }}</h3>
        <button
          type="button"
          class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
          :class="highlightAddCraft ? 'scale-105 ring-4 ring-[#f3c84b] ring-offset-2 ring-offset-white shadow-[0_0_24px_rgba(243,200,75,0.85)]' : ''"
          :disabled="!isAvailable"
          @click="openCraftModal"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="craftEntries.length === 0" class="mt-2 text-sm text-muted">
        {{ t("ui.noCraftEntries") }}
      </div>

      <div v-for="entry in craftEntries" :key="entry.id" class="mt-3 rounded-md border border-line bg-[#fffdf8] p-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-bold">{{ recipeById(entry.recipeId).name }}</div>
            <div class="mt-1 text-xs text-muted">{{ formatList(recipeById(entry.recipeId).costs) }}</div>
          </div>
          <button
            type="button"
            class="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-ambered transition hover:bg-ambered hover:text-white"
            @click="$emit('remove-craft-entry', station.id, entry.id)"
          >
            {{ t("ui.remove") }}
          </button>
        </div>

        <label class="mt-3 grid gap-1 text-xs font-bold text-muted">
          {{ t("ui.target") }}
          <input
            class="rounded-md border border-line bg-white px-2 py-2 text-base font-bold text-ink"
            type="number"
            min="0"
            :value="entry.target"
            @input="$emit('update-craft-entry-target', station.id, entry.id, Number($event.target.value))"
          >
        </label>

        <div class="mt-2 rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-muted">
          {{ t("ui.stockCurrent") }} {{ currentAmount(entry.id) }} /
          {{ t("ui.stockExpected") }} {{ expectedAmount(entry.id) }} /
          {{ t("ui.stockTargetShort") }} {{ entry.target }} /
          {{ craftEntryStatus(entry.id) }}
        </div>

        <button
          type="button"
          class="mt-3 w-full rounded-md px-4 py-2.5 font-bold text-white transition"
          :class="canStartEntry(entry.id) ? 'bg-leaf hover:bg-moss' : 'cursor-not-allowed bg-stone-400'"
          :disabled="!canStartEntry(entry.id)"
          @click="$emit('start-craft-entry', station.id, entry.id)"
        >
          {{ t("ui.startCraftEntry") }}
        </button>
      </div>
    </div>

    <div class="mt-3 rounded-md border border-line bg-white p-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold">{{ t("ui.runningTasks") }}</h3>
        <span class="text-xs text-muted">{{ t("ui.taskCount", { count: tasks.length }) }}</span>
      </div>

      <div v-if="tasks.length === 0" class="mt-2 text-sm text-muted">
        {{ t("ui.noRunningTasks") }}
      </div>

      <div v-for="task in tasks" :key="task.id" class="mt-3 grid gap-1.5">
        <div class="flex items-center justify-between gap-2 text-sm font-bold">
          <span>{{ taskLabel(task) }}</span>
          <span class="text-xs font-semibold text-muted">{{ villagerName(task.villagerId) }}</span>
        </div>
        <div class="flex justify-between text-xs text-muted">
          <span>{{ taskProgress(task) }}%</span>
          <span>{{ t("ui.remainingSeconds", { seconds: remainingSeconds(task) }) }}</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full border border-[#c7bdad] bg-[#eee7dd]">
          <div class="h-full rounded-full bg-gradient-to-r from-leaf to-lime-600 transition-[width]" :style="{ width: `${taskProgress(task)}%` }"></div>
        </div>
      </div>
    </div>

    <div v-if="showCraftModal" class="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
      <div class="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-panel">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold">{{ t("ui.addCraftEntry") }}</h3>
          <button type="button" class="text-sm font-bold text-muted" @click="closeCraftModal">{{ t("ui.close") }}</button>
        </div>

        <label class="mt-4 grid gap-1 text-sm font-bold text-muted">
          {{ t("ui.recipe") }}
          <select v-model="draftRecipeId" class="rounded-md border border-line bg-white px-3 py-2 text-base text-ink">
            <option disabled value="">{{ t("ui.selectRecipe") }}</option>
            <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">
              {{ recipe.name }}
            </option>
          </select>
        </label>

        <label class="mt-3 grid gap-1 text-sm font-bold text-muted">
          {{ t("ui.target") }}
          <input v-model.number="draftTarget" class="rounded-md border border-line bg-white px-3 py-2 text-base text-ink" type="number" min="0">
        </label>

        <button
          type="button"
          class="mt-4 w-full rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss"
          :disabled="!canSubmitCraft"
          @click="submitCraftEntry"
        >
          {{ t("ui.confirm") }}
        </button>
      </div>
    </div>

    <div v-if="showVillagerModal" class="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
      <div class="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-panel">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold">{{ t("ui.assignVillager") }}</h3>
          <button type="button" class="text-sm font-bold text-muted" @click="showVillagerModal = false">{{ t("ui.close") }}</button>
        </div>

        <div v-if="availableVillagers.length === 0" class="mt-4 text-sm text-muted">
          {{ t("ui.noVillagersAvailable") }}
        </div>

        <div v-for="villager in availableVillagers" :key="villager.id" class="mt-3 flex items-center justify-between gap-2 rounded-md border border-line bg-[#fffdf8] px-3 py-2">
          <div>
            <div class="font-bold">{{ villager.name }}</div>
            <div class="text-xs text-muted">{{ villager.taskId ? t("ui.busy") : t("ui.idle") }}</div>
          </div>
          <button
            type="button"
            class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
            @click="addVillager(villager.id)"
          >
            {{ t("ui.add") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "../i18n/index.js";

const { t } = useI18n();

const props = defineProps({
  station: { type: Object, required: true },
  isAvailable: { type: Boolean, required: true },
  assignedVillagers: { type: Array, required: true },
  availableVillagers: { type: Array, required: true },
  tasks: { type: Array, required: true },
  recipes: { type: Array, required: true },
  craftEntries: { type: Array, required: true },
  currentAmount: { type: Function, required: true },
  expectedAmount: { type: Function, required: true },
  craftEntryStatus: { type: Function, required: true },
  canStartEntry: { type: Function, required: true },
  recipeById: { type: Function, required: true },
  taskLabel: { type: Function, required: true },
  villagerName: { type: Function, required: true },
  taskProgress: { type: Function, required: true },
  remainingSeconds: { type: Function, required: true },
  formatList: { type: Function, required: true },
  highlightAddVillager: { type: Boolean, default: false },
  highlightAddCraft: { type: Boolean, default: false },
});

const emit = defineEmits([
  "add-villager",
  "remove-villager",
  "add-craft-entry",
  "remove-craft-entry",
  "update-craft-entry-target",
  "start-craft-entry",
]);

const showCraftModal = ref(false);
const showVillagerModal = ref(false);
const draftRecipeId = ref("");
const draftTarget = ref(1);

const canSubmitCraft = computed(() => draftRecipeId.value !== "" && Number.isFinite(draftTarget.value) && draftTarget.value >= 0);

function openCraftModal() {
  draftRecipeId.value = props.recipes[0]?.id || "";
  draftTarget.value = 1;
  showCraftModal.value = true;
}

function closeCraftModal() {
  showCraftModal.value = false;
}

function submitCraftEntry() {
  if (!canSubmitCraft.value) {
    return;
  }
  emit("add-craft-entry", props.station.id, draftRecipeId.value, draftTarget.value);
  closeCraftModal();
}

function addVillager(villagerId) {
  emit("add-villager", villagerId, props.station.id);
  showVillagerModal.value = false;
}
</script>
