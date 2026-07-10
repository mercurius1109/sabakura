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
          :class="highlightAddVillager ? 'tutorial-highlight tutorial-highlight-ui' : ''"
          :disabled="!isAvailable"
          @click="showVillagerModal = true"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="assignedVillagers.length === 0" class="mt-2 text-sm text-muted">
        {{ t("ui.noAssignedStations") }}
      </div>

      <div v-if="assignedVillagers.length > 0" class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
        <button
          v-for="villager in assignedVillagers"
          :key="villager.id"
          type="button"
          class="group relative flex h-[88px] w-[88px] flex-col justify-between rounded-xl border border-line bg-[#fffdf8] px-2 py-2 text-left transition hover:-translate-y-0.5"
        >
          <span
            role="button"
            tabindex="0"
            class="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1e8] text-[#b4491e] opacity-0 shadow-sm ring-1 ring-[#f2b899] transition group-hover:opacity-100"
            @click.stop="removeVillager(villager.id)"
            @keydown.enter.stop.prevent="removeVillager(villager.id)"
            @keydown.space.stop.prevent="removeVillager(villager.id)"
          >
            <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </span>
          <div class="pr-5 text-xs font-bold leading-4 text-ink">{{ villager.name }}</div>
          <div class="flex items-center justify-center text-3xl leading-none text-ink/80" aria-hidden="true">{{ villagerIcon }}</div>
          <div class="self-end text-[10px] font-bold leading-4 text-muted">{{ station.name }}</div>
        </button>
      </div>
    </div>

    <div v-if="recipes.length > 0 || craftEntries.length > 0" class="mt-3 rounded-md border border-line bg-white p-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold">{{ t("ui.craftEntries") }}</h3>
        <button
          type="button"
          class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
          :class="highlightAddCraft ? 'tutorial-highlight tutorial-highlight-ui' : ''"
          :disabled="!isAvailable"
          @click="openCraftModal"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="craftEntries.length === 0" class="mt-2 text-sm text-muted">
        {{ t("ui.noCraftEntries") }}
      </div>

      <div v-if="craftEntries.length > 0" class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3">
        <button
          v-for="entry in craftEntries"
          :key="entry.id"
          type="button"
          :title="craftEntryTooltip(entry)"
          class="group relative flex h-[72px] w-[72px] items-center justify-center rounded-xl border border-line bg-[#fffdf8] transition hover:-translate-y-0.5"
          @click="openEditCraftModal(entry.id)"
        >
          <span class="absolute left-1.5 top-1.5 max-w-[46px] truncate text-[10px] font-bold leading-4 text-ink">
            {{ recipeById(entry.recipeId).name }}
          </span>
          <span
            role="button"
            tabindex="0"
            class="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1e8] text-xs font-bold text-[#b4491e] opacity-0 shadow-sm ring-1 ring-[#f2b899] transition group-hover:opacity-100"
            @click.stop="removeCraftEntry(entry.id)"
            @keydown.enter.stop.prevent="removeCraftEntry(entry.id)"
            @keydown.space.stop.prevent="removeCraftEntry(entry.id)"
          >
            <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </span>
          <span class="absolute bottom-1 right-1 rounded-full bg-white/90 px-1.5 text-[10px] font-bold leading-5 text-ambered">
            {{ currentAmount(entry.id) }}/{{ entry.target }}
          </span>
          <span class="text-3xl leading-none" aria-hidden="true">{{ craftEntryIcon(entry) }}</span>
          <span class="sr-only">{{ recipeById(entry.recipeId).name }}</span>
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

        <div class="mt-4 text-sm font-bold text-muted">{{ t("ui.recipe") }}</div>
        <div v-if="availableRecipes.length === 0" class="mt-3 text-sm text-muted">
          {{ t("ui.noCraftEntries") }}
        </div>
        <div v-else class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3">
          <button
            v-for="recipe in availableRecipes"
            :key="recipe.id"
            type="button"
            :title="availableRecipeTooltip(recipe)"
            class="relative flex h-[72px] w-[72px] items-center justify-center rounded-xl border bg-[#fffdf8] transition"
            :class="draftRecipeId === recipe.id
              ? 'border-moss shadow-[0_0_0_2px_rgba(45,106,79,0.25)]'
              : 'border-line hover:-translate-y-0.5'"
            @click="draftRecipeId = recipe.id"
          >
            <span class="text-3xl leading-none" aria-hidden="true">{{ recipeOutputIcon(recipe) }}</span>
            <span class="sr-only">{{ recipe.name }}</span>
          </button>
        </div>

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

    <div v-if="showEditCraftModal && editingCraftEntry" class="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
      <div class="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-panel">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold">{{ recipeById(editingCraftEntry.recipeId).name }}</h3>
          <button type="button" class="text-sm font-bold text-muted" @click="closeEditCraftModal">{{ t("ui.close") }}</button>
        </div>

        <div class="mt-3 rounded-md border border-line bg-[#fffdf8] px-3 py-3 text-sm text-muted">
          {{ formatList(recipeById(editingCraftEntry.recipeId).costs) }}
        </div>

        <label class="mt-4 grid gap-1 text-sm font-bold text-muted">
          {{ t("ui.target") }}
          <input
            v-model.number="editingCraftTarget"
            class="rounded-md border border-line bg-white px-3 py-2 text-base text-ink"
            type="number"
            min="0"
          >
        </label>

        <div class="mt-3 text-sm text-muted">
          {{ currentAmount(editingCraftEntry.id) }}/{{ editingCraftEntry.target }}
        </div>

        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss"
            @click="submitEditCraftEntry"
          >
            {{ t("ui.confirm") }}
          </button>
          <button
            type="button"
            class="rounded-md border border-line bg-white px-4 py-2.5 font-bold text-ambered transition hover:bg-ambered hover:text-white"
            @click="removeCraftEntry(editingCraftEntry.id)"
          >
            {{ t("ui.remove") }}
          </button>
        </div>
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

        <div v-if="availableVillagers.length > 0" class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
          <button
            v-for="villager in availableVillagers"
            :key="villager.id"
            type="button"
            class="flex h-[88px] w-[88px] flex-col justify-between rounded-xl border border-line bg-[#fffdf8] px-2 py-2 text-left transition hover:-translate-y-0.5"
            @click="addVillager(villager.id)"
          >
            <div class="text-xs font-bold leading-4 text-ink">{{ villager.name }}</div>
            <div class="flex items-center justify-center text-3xl leading-none text-ink/80" aria-hidden="true">{{ villagerIcon }}</div>
            <div class="self-end max-w-full truncate text-[10px] font-bold leading-4 text-moss">
              {{ villagerAssignedStationLabel(villager) }}
            </div>
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
  itemDefinitions: { type: Object, required: true },
  stationNameById: { type: Function, required: false, default: null },
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
const showEditCraftModal = ref(false);
const showVillagerModal = ref(false);
const villagerIcon = "\uD83E\uDDD1";
const draftRecipeId = ref("");
const draftTarget = ref(1);
const editingCraftEntryId = ref(null);
const editingCraftTarget = ref(1);

const canSubmitCraft = computed(() => draftRecipeId.value !== "" && Number.isFinite(draftTarget.value) && draftTarget.value >= 0);
const editingCraftEntry = computed(() =>
  props.craftEntries.find((entry) => entry.id === editingCraftEntryId.value) || null,
);
const availableRecipes = computed(() => {
  const registeredRecipeIds = new Set(props.craftEntries.map((entry) => entry.recipeId));
  return props.recipes.filter((recipe) => !registeredRecipeIds.has(recipe.id));
});

function openCraftModal() {
  draftRecipeId.value = availableRecipes.value[0]?.id || "";
  draftTarget.value = 1;
  showCraftModal.value = true;
}

function closeCraftModal() {
  showCraftModal.value = false;
}

function openEditCraftModal(entryId) {
  const entry = props.craftEntries.find((craftEntry) => craftEntry.id === entryId);
  if (!entry) {
    return;
  }
  editingCraftEntryId.value = entryId;
  editingCraftTarget.value = entry.target;
  showEditCraftModal.value = true;
}

function closeEditCraftModal() {
  showEditCraftModal.value = false;
  editingCraftEntryId.value = null;
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

function removeVillager(villagerId) {
  emit("remove-villager", villagerId, props.station.id);
}

function submitEditCraftEntry() {
  if (!editingCraftEntry.value) {
    return;
  }
  emit("update-craft-entry-target", props.station.id, editingCraftEntry.value.id, Number(editingCraftTarget.value));
  closeEditCraftModal();
}

function craftEntryOutputItemId(entry) {
  return Object.keys(props.recipeById(entry.recipeId)?.outputs || {})[0] || null;
}

function recipeOutputItemId(recipe) {
  return Object.keys(recipe?.outputs || {})[0] || null;
}

function craftEntryIcon(entry) {
  const itemId = craftEntryOutputItemId(entry);
  return itemId ? props.itemDefinitions[itemId]?.icon || "?" : "?";
}

function recipeOutputIcon(recipe) {
  const itemId = recipeOutputItemId(recipe);
  return itemId ? props.itemDefinitions[itemId]?.icon || "?" : "?";
}

function craftEntryTooltip(entry) {
  const recipe = props.recipeById(entry.recipeId);
  return `${recipe.name}\n${props.formatList(recipe.costs)}\n${props.currentAmount(entry.id)}/${entry.target}`;
}

function availableRecipeTooltip(recipe) {
  return `${recipe.name}\n${props.formatList(recipe.costs)}`;
}

function removeCraftEntry(entryId) {
  emit("remove-craft-entry", props.station.id, entryId);
  if (editingCraftEntryId.value === entryId) {
    closeEditCraftModal();
  }
}

function villagerAssignedStationLabel(villager) {
  const assignedStationId = villager.assignedStations?.[0] || null;
  if (!assignedStationId) {
    return t("ui.noAssignedStations");
  }
  return props.stationNameById ? props.stationNameById(assignedStationId) : assignedStationId;
}
</script>
