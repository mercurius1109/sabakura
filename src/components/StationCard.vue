<template>
  <div
    class="relative transition-opacity"
    :class="[rootClass, isAvailable ? 'opacity-100' : 'opacity-55']"
  >
    <div class="flex items-center justify-between gap-2 font-bold">
      <span class="text-white/[0.95]">{{ station.name }}</span>
      <span class="rounded-full px-3 py-1 text-xs font-bold" :class="isAvailable ? 'bg-white/[0.18] text-white/[0.92] backdrop-blur-sm' : 'bg-white/[0.14] text-white/[0.7] backdrop-blur-sm'">
        {{ isAvailable ? t("ui.available") : t("ui.unavailable") }}
      </span>
    </div>

    <p class="mt-2 text-sm leading-6 text-white/[0.7]">{{ station.description }}</p>

    <div v-if="showFuelPanel" class="mt-4 rounded-xl bg-white/[0.24] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-bold text-white/[0.92]">{{ t("ui.fuel") }}</h3>
        <span class="text-xs font-semibold text-white/[0.7]">
          {{ isBurning ? t("ui.burning") : t("ui.notBurning") }}
        </span>
      </div>

      <div class="mt-3 flex items-center justify-between gap-3 rounded-lg bg-white/[0.3] px-3 py-3 backdrop-blur-sm">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.5] backdrop-blur-sm">
            <div class="h-7 w-7">
              <GameIcon :icon="currentFuelItem?.icon || ''" :alt="currentFuelItem?.name || t('ui.fuel')" fallback="🔥" />
            </div>
          </div>
          <div>
            <div class="text-sm font-bold text-white/[0.92]">{{ currentFuelItem?.name || t("ui.fuel") }}</div>
            <div class="text-xs text-white/[0.66]">{{ t("ui.currentOfTarget", { current: fuelCount, target: playerFuelTotal }) }}</div>
          </div>
        </div>
        <div class="text-right text-xs text-white/[0.66]">
          <div>{{ t("ui.remainingSeconds", { seconds: burnRemainingSeconds }) }}</div>
        </div>
      </div>

      <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e6dece]/85">
        <div class="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width]" :style="{ width: `${burnProgress}%` }"></div>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <InventoryActionGrid
          :caption="t('ui.addFuel')"
          :empty-text="t('common.carryingNone')"
          :entries="playerFuelEntries"
          :disabled="!isPlayerAdjacent"
          :disabled-text="t('ui.moveNextToFacility')"
          @select="transferFuelToStation"
        />
        <InventoryActionGrid
          :caption="t('ui.takeFuel')"
          :empty-text="t('common.carryingNone')"
          :entries="stationFuelEntries"
          :disabled="!isPlayerAdjacent"
          :disabled-text="t('ui.moveNextToFacility')"
          @select="transferFuelToPlayer"
        />
      </div>

      <div v-if="!isPlayerAdjacent" class="mt-2 text-xs text-white/[0.66]">
        {{ t("ui.moveNextToFacility") }}
      </div>
    </div>

    <div v-if="inventoryEntries.length > 0 || showFuelPanel" class="mt-4" :class="sectionClass">
      <InventoryActionGrid
        :caption="t('ui.container')"
        :empty-text="t('common.carryingNone')"
        :entries="inventoryEntries"
        :disabled="false"
        :disabled-text="''"
        @select="transferItemToPlayer"
      />
      <div v-if="!isPlayerAdjacent && inventoryEntries.length > 0" class="mt-3 text-sm text-white/[0.66]">
        {{ t("ui.moveNextToFacility") }}
      </div>
    </div>

    <div class="mt-4" :class="sectionClass">
      <div class="flex items-center justify-between gap-2 text-white/[0.92]">
        <h3 class="text-sm font-bold text-white/[0.92]">{{ t("ui.assignVillager") }}</h3>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-bold transition"
          :class="[isWorkbench ? 'bg-white/[0.16] text-white/[0.9] backdrop-blur-sm hover:bg-white/[0.24]' : 'bg-white/[0.42] text-white/[0.9] backdrop-blur-sm hover:bg-white/[0.56]', highlightAddVillager ? 'tutorial-highlight tutorial-highlight-ui' : '']"
          :disabled="!isAvailable"
          @click="openVillagerModal"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="assignedVillagers.length === 0" class="mt-2 text-sm text-white/[0.66]">
        {{ t("ui.noAssignedStations") }}
      </div>

      <div v-if="assignedVillagers.length > 0" class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
        <button
          v-for="villager in assignedVillagers"
          :key="villager.id"
          type="button"
          class="group relative flex h-[88px] w-[88px] flex-col justify-between rounded-lg bg-white/[0.34] px-2 py-2 text-left backdrop-blur-sm transition hover:-translate-y-0.5"
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
          <div class="pr-5 text-xs font-bold leading-4 text-white/[0.92]">{{ villager.name }}</div>
          <div class="flex flex-1 items-center justify-center text-3xl leading-none text-white/[0.8]" aria-hidden="true">{{ villagerIcon }}</div>
          <div class="self-end text-[10px] font-bold leading-4 text-white/[0.62]">{{ station.name }}</div>
        </button>
      </div>
    </div>

    <div v-if="recipes.length > 0 || craftEntries.length > 0" class="mt-4" :class="sectionClass">
      <div class="flex items-center justify-between gap-2 text-white/[0.92]">
        <h3 class="text-sm font-bold text-white/[0.92]">{{ t("ui.craftEntries") }}</h3>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-bold transition"
          :class="[isWorkbench ? 'bg-white/[0.16] text-white/[0.9] backdrop-blur-sm hover:bg-white/[0.24]' : 'bg-white/[0.42] text-white/[0.9] backdrop-blur-sm hover:bg-white/[0.56]', highlightAddCraft ? 'tutorial-highlight tutorial-highlight-ui' : '']"
          :disabled="!isAvailable"
          @click="openCraftModal"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="craftEntries.length === 0" class="mt-2 text-sm text-white/[0.66]">
        {{ t("ui.noCraftEntries") }}
      </div>

      <div v-if="craftEntries.length > 0" class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3">
        <button
          v-for="entry in craftEntries"
          :key="entry.id"
          type="button"
          :title="craftEntryTooltip(entry)"
          class="group relative flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-white/[0.34] backdrop-blur-sm transition hover:-translate-y-0.5"
          @click="openEditCraftModal(entry.id)"
        >
          <span class="absolute left-1.5 top-1.5 max-w-[46px] truncate text-[10px] font-bold leading-4 text-white/[0.9]">
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
          <span class="absolute bottom-1 right-1 rounded-full bg-white/[0.18] px-1.5 text-[10px] font-bold leading-5 text-white/[0.92] backdrop-blur-sm">
            {{ currentAmount(entry.id) }}/{{ entry.target }}
          </span>
          <div class="flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden="true">
            <GameIcon :icon="craftEntryIcon(entry)" :alt="recipeById(entry.recipeId).name" />
          </div>
          <span class="sr-only">{{ recipeById(entry.recipeId).name }}</span>
        </button>
      </div>
    </div>

    <div class="mt-4" :class="sectionClass">
      <div class="flex items-center justify-between gap-2 text-white/[0.92]">
        <h3 class="text-sm font-bold text-white/[0.92]">{{ t("ui.runningTasks") }}</h3>
        <span class="text-xs text-white/[0.66]">{{ t("ui.taskCount", { count: tasks.length }) }}</span>
      </div>

      <div v-if="tasks.length === 0" class="mt-2 text-sm text-white/[0.66]">
        {{ t("ui.noRunningTasks") }}
      </div>

      <div v-for="task in tasks" :key="task.id" class="mt-3 grid gap-1.5">
        <div class="flex items-center justify-between gap-2 text-sm font-bold">
          <span class="text-white/[0.9]">{{ taskDisplayText(task) }}</span>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-white/[0.66]">{{ villagerName(task.villagerId) }}</span>
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1e8] text-[#b4491e] shadow-sm ring-1 ring-[#f2b899] transition hover:bg-[#ffe3d3]"
              @click="$emit('cancel-task', task.id)"
            >
              <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex justify-between text-xs text-white/[0.66]">
          <span>{{ taskProgress(task) }}%</span>
          <span>{{ t("ui.remainingSeconds", { seconds: remainingSeconds(task) }) }}</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-[#e6dece]/85">
          <div class="h-full rounded-full bg-gradient-to-r from-leaf to-lime-600 transition-[width]" :style="{ width: `${taskProgress(task)}%` }"></div>
        </div>
      </div>
    </div>

    <WindowModalHost :modal="activeModal" :visible="isStationModalVisible">
      <template v-if="activeModal?.type === 'craft-add'">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold text-white/[0.95]">{{ t("ui.addCraftEntry") }}</h3>
          <button type="button" class="text-sm font-bold text-white/[0.7]" @click="closeTopModal">{{ t("ui.close") }}</button>
        </div>

        <div class="mt-4 text-sm font-bold text-white/[0.7]">{{ t("ui.recipe") }}</div>
        <div v-if="availableRecipes.length === 0" class="mt-3 text-sm text-white/[0.66]">
          {{ t("ui.noCraftEntries") }}
        </div>
        <div v-else class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3">
          <button
            v-for="recipe in availableRecipes"
            :key="recipe.id"
            type="button"
            :title="availableRecipeTooltip(recipe)"
            class="relative flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-white/[0.34] backdrop-blur-sm transition"
            :class="draftRecipeId === recipe.id
              ? 'border-moss shadow-[0_0_0_2px_rgba(45,106,79,0.25)]'
              : 'border-line hover:-translate-y-0.5'"
            @click="draftRecipeId = recipe.id"
          >
            <div class="h-10 w-10" aria-hidden="true">
              <GameIcon :icon="recipeOutputIcon(recipe)" :alt="recipe.name" />
            </div>
            <span class="sr-only">{{ recipe.name }}</span>
          </button>
        </div>

        <label class="mt-3 grid gap-1 text-sm font-bold text-white/[0.7]">
          {{ t("ui.target") }}
          <input v-model.number="draftTarget" class="rounded-lg bg-white/[0.55] px-3 py-2 text-base text-white/[0.92] placeholder:text-white/[0.45]" type="number" min="0">
        </label>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="amount in [-100, -10, -1, 1, 10, 100]"
            :key="`draft-target-${amount}`"
            type="button"
            class="rounded-lg bg-white/[0.42] px-3 py-1.5 text-sm font-bold text-white/[0.9] backdrop-blur-sm transition hover:bg-white/[0.56]"
            @click="draftTarget = adjustTargetValue(draftTarget, amount, 0)"
          >
            {{ amount > 0 ? `+${amount}` : amount }}
          </button>
        </div>

        <button
          type="button"
          class="mt-4 w-full rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmitCraft"
          @click="submitCraftEntry"
        >
          {{ t("ui.confirm") }}
        </button>
      </template>

      <template v-else-if="activeModal?.type === 'craft-edit' && editingCraftEntry">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold text-white/[0.95]">{{ recipeById(editingCraftEntry.recipeId).name }}</h3>
          <button type="button" class="text-sm font-bold text-white/[0.7]" @click="closeTopModal">{{ t("ui.close") }}</button>
        </div>

        <div class="mt-3 rounded-lg bg-white/[0.34] px-3 py-3 text-sm text-white/[0.74] backdrop-blur-sm">
          {{ formatList(recipeById(editingCraftEntry.recipeId).costs) }}
        </div>

        <label class="mt-4 grid gap-1 text-sm font-bold text-white/[0.7]">
          {{ t("ui.target") }}
          <input
            v-model.number="editingCraftTarget"
            class="rounded-lg bg-white/[0.55] px-3 py-2 text-base text-white/[0.92] placeholder:text-white/[0.45]"
            type="number"
            min="0"
          >
        </label>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="amount in [-100, -10, -1, 1, 10, 100]"
            :key="`editing-target-${amount}`"
            type="button"
            class="rounded-lg bg-white/[0.42] px-3 py-1.5 text-sm font-bold text-white/[0.9] backdrop-blur-sm transition hover:bg-white/[0.56]"
            @click="editingCraftTarget = adjustTargetValue(editingCraftTarget, amount, 0)"
          >
            {{ amount > 0 ? `+${amount}` : amount }}
          </button>
        </div>

        <div class="mt-3 text-sm text-white/[0.66]">
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
            class="rounded-lg bg-white/[0.42] px-4 py-2.5 font-bold text-white/[0.9] backdrop-blur-sm transition hover:bg-white/[0.56]"
            @click="removeCraftEntry(editingCraftEntry.id)"
          >
            {{ t("ui.remove") }}
          </button>
        </div>
      </template>

      <template v-else-if="activeModal?.type === 'assign-villager'">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold text-white/[0.95]">{{ t("ui.assignVillager") }}</h3>
          <button type="button" class="text-sm font-bold text-white/[0.7]" @click="closeTopModal">{{ t("ui.close") }}</button>
        </div>

        <div v-if="availableVillagers.length === 0" class="mt-4 text-sm text-white/[0.66]">
          {{ t("ui.noVillagersAvailable") }}
        </div>

        <div v-if="availableVillagers.length > 0" class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
          <button
            v-for="villager in availableVillagers"
            :key="villager.id"
            type="button"
            class="flex h-[88px] w-[88px] flex-col justify-between rounded-lg bg-white/[0.34] px-2 py-2 text-left backdrop-blur-sm transition hover:-translate-y-0.5"
            @click="addVillager(villager.id)"
          >
            <div class="text-xs font-bold leading-4 text-white/[0.92]">{{ villager.name }}</div>
            <div class="flex items-center justify-center text-3xl leading-none text-white/[0.8]" aria-hidden="true">{{ villagerIcon }}</div>
            <div class="self-end max-w-full truncate text-[10px] font-bold leading-4 text-white/[0.72]">
              {{ villagerAssignedStationLabel(villager) }}
            </div>
          </button>
        </div>
      </template>
    </WindowModalHost>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "../i18n/index.js";
import { useWindowModalStack, useWindowModalStackContext } from "../composables/useWindowModalStack.js";
import GameIcon from "./GameIcon.vue";
import InventoryActionGrid from "./InventoryActionGrid.vue";
import WindowModalHost from "./WindowModalHost.vue";

const { t } = useI18n();

const props = defineProps({
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
  stationNameById: { type: Function, required: false, default: null },
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
  playerFuelEntries: { type: Array, default: () => [] },
  stationFuelEntries: { type: Array, default: () => [] },
  burnRemainingMs: { type: Number, default: 0 },
  burnDurationMs: { type: Number, default: 0 },
});

const emit = defineEmits([
  "add-villager",
  "remove-villager",
  "add-craft-entry",
  "remove-craft-entry",
  "update-craft-entry-target",
  "start-craft-entry",
  "cancel-task",
  "transfer-fuel-to-station",
  "transfer-fuel-to-player",
  "transfer-item-to-player",
]);

const villagerIcon = "🧑";
const draftRecipeId = ref("");
const draftTarget = ref(1);
const editingCraftEntryId = ref(null);
const editingCraftTarget = ref(1);
const modalStack = useWindowModalStackContext() || useWindowModalStack();
const { activeModal, openModal, closeTopModal } = modalStack;

const canSubmitCraft = computed(() => draftRecipeId.value !== "" && Number.isFinite(draftTarget.value) && draftTarget.value >= 0);
const editingCraftEntry = computed(() =>
  activeModal.value?.type === "craft-edit"
    ? props.craftEntries.find((entry) => entry.id === activeModal.value.entryId) || null
    : null,
);
const availableRecipes = computed(() => {
  const registeredRecipeIds = new Set(props.craftEntries.map((entry) => entry.recipeId));
  return props.recipes.filter((recipe) => !registeredRecipeIds.has(recipe.id));
});
const currentFuelItem = computed(() => (
  props.currentFuelItemId ? props.itemDefinitions[props.currentFuelItemId] || null : null
));
const isWorkbench = computed(() => props.station.id === "workbench");
const rootClass = computed(() => (
  isWorkbench.value
    ? "p-0"
    : "rounded-xl bg-white/[0.28] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md"
));
const showFuelPanel = computed(() => props.station.id === "cookingStation");
const playerFuelTotal = computed(() => props.playerFuelEntries.reduce((total, entry) => total + entry.amount, 0));
const sectionClass = computed(() => (
  isWorkbench.value
    ? "p-0"
    : "rounded-xl bg-white/[0.24] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md"
));
const burnRemainingSeconds = computed(() => Math.max(0, Math.ceil((props.burnRemainingMs || 0) / 1000)));
const burnProgress = computed(() => {
  if (!props.burnDurationMs) {
    return 0;
  }
  return Math.max(0, Math.min(100, ((props.burnRemainingMs || 0) / props.burnDurationMs) * 100));
});
const isBurning = computed(() => props.burnRemainingMs > 0);
const isStationModalVisible = computed(() => (
  activeModal.value?.type === "craft-add"
  || activeModal.value?.type === "craft-edit"
  || activeModal.value?.type === "assign-villager"
));

function openCraftModal() {
  draftRecipeId.value = availableRecipes.value[0]?.id || "";
  draftTarget.value = 1;
  openModal({ type: "craft-add" });
}

function openEditCraftModal(entryId) {
  const entry = props.craftEntries.find((craftEntry) => craftEntry.id === entryId);
  if (!entry) {
    return;
  }
  editingCraftTarget.value = entry.target;
  openModal({ type: "craft-edit", entryId });
}

function openVillagerModal() {
  openModal({ type: "assign-villager" });
}

function submitCraftEntry() {
  if (!canSubmitCraft.value) {
    return;
  }
  emit("add-craft-entry", props.station.id, draftRecipeId.value, draftTarget.value);
  closeTopModal();
}

function addVillager(villagerId) {
  emit("add-villager", villagerId, props.station.id);
  closeTopModal();
}

function removeVillager(villagerId) {
  emit("remove-villager", villagerId, props.station.id);
}

function transferItemToPlayer(itemId) {
  emit("transfer-item-to-player", props.station.id, itemId);
}

function transferFuelToStation(itemId) {
  emit("transfer-fuel-to-station", props.station.id, itemId);
}

function transferFuelToPlayer(itemId) {
  emit("transfer-fuel-to-player", props.station.id, itemId);
}

function submitEditCraftEntry() {
  if (!editingCraftEntry.value) {
    return;
  }
  emit("update-craft-entry-target", props.station.id, editingCraftEntry.value.id, Number(editingCraftTarget.value));
  closeTopModal();
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
  if (activeModal.value?.type === "craft-edit" && activeModal.value.entryId === entryId) {
    closeTopModal();
  }
}

function villagerAssignedStationLabel(villager) {
  const assignedStationId = villager.assignedStations?.[0] || null;
  if (!assignedStationId) {
    return t("ui.noAssignedStations");
  }
  return props.stationNameById ? props.stationNameById(assignedStationId) : assignedStationId;
}

function adjustTargetValue(currentValue, delta, minValue) {
  const nextValue = (Number(currentValue) || 0) + delta;
  return Math.max(minValue, nextValue);
}
</script>
