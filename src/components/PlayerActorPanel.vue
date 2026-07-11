<template>
  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <InventoryGrid
      :item-cards="itemCards"
      :owned-kinds="ownedKinds"
      :caption="transferCaption"
      :empty-text="t('common.carryingNone')"
      :clickable="true"
      :disabled="transferDisabled"
      :disabled-text="transferDisabledText"
      @select="(itemId) => $emit('select-transfer', itemId)"
    />

    <TaskPanel
      class="mt-4"
      :task="task"
      :task-label="taskLabel"
      :task-progress="taskProgress"
      :remaining-seconds="remainingSeconds"
      :on-cancel="onCancelTask"
    />

    <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold text-ink">{{ t("ui.handCraft") }}</div>
        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
          {{ isBusy ? t("ui.busy") : t("ui.ready") }}
        </span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="recipe in recipes"
          :key="recipe.id"
          :title="recipeTooltip(recipe)"
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition"
          :class="recipeButtonClass(recipe)"
          :disabled="!canStartRecipe(recipe)"
          @click="$emit('start-recipe', recipe.id)"
        >
          <span class="text-xl leading-none" aria-hidden="true">{{ recipeIcon(recipe) }}</span>
          <span class="sr-only">{{ recipe.name }}</span>
        </button>
      </div>
    </div>

    <div v-if="showBuildSection" class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold text-ink">{{ t("ui.build") }}</div>
        <span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-muted">
          {{ buildCards.length }} {{ t("ui.options") }}
        </span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="building in buildCards"
          :key="building.id"
          :title="buildTooltip(building)"
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition"
          :class="buildButtonClass(building)"
          :disabled="!canPlaceStructure(building.id)"
          @click="$emit('start-building', building.id)"
        >
          <span class="text-xl leading-none" aria-hidden="true">{{ building.icon }}</span>
          <span class="sr-only">{{ building.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import InventoryGrid from "./InventoryGrid.vue";
import TaskPanel from "./TaskPanel.vue";
import { useI18n } from "../i18n/index.js";

defineProps({
  itemCards: { type: Array, required: true },
  ownedKinds: { type: Number, required: true },
  transferCaption: { type: String, required: true },
  transferDisabled: { type: Boolean, default: false },
  transferDisabledText: { type: String, default: "" },
  task: { type: Object, default: null },
  taskLabel: { type: Function, required: true },
  taskProgress: { type: Function, required: true },
  remainingSeconds: { type: Function, required: true },
  onCancelTask: { type: Function, default: null },
  isBusy: { type: Boolean, required: true },
  recipes: { type: Array, required: true },
  recipeTooltip: { type: Function, required: true },
  recipeButtonClass: { type: Function, required: true },
  recipeIcon: { type: Function, required: true },
  canStartRecipe: { type: Function, required: true },
  showBuildSection: { type: Boolean, default: false },
  buildCards: { type: Array, default: () => [] },
  buildTooltip: { type: Function, default: () => "" },
  buildButtonClass: { type: Function, default: () => "" },
  canPlaceStructure: { type: Function, default: () => false },
});

defineEmits(["select-transfer", "start-recipe", "start-building"]);

const { t } = useI18n();
</script>
