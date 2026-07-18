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
      @select="openItemActions"
    />

    <div v-if="selectedItem && selectedItemActions.length > 0" class="mt-4 rounded-xl bg-white/[0.28] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-bold text-white/[0.92]">{{ selectedItem.name }}</div>
          <div class="mt-1 text-xs font-bold text-white/[0.62]">{{ selectedItem.amount }}</div>
        </div>
        <button type="button" class="text-xs font-bold text-white/[0.62] transition hover:text-white" @click="closeItemActions">
          {{ t("ui.close") }}
        </button>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="action in selectedItemActions"
          :key="action.id"
          type="button"
          class="rounded-lg bg-white/[0.38] px-3 py-2 text-sm font-bold text-white/[0.9] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/[0.52]"
          @click="selectItemAction(action.id)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>

    <div v-if="showCraftSection" class="mt-4">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold text-white/[0.92]">{{ t("ui.handCraft") }}</div>
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
          :class="[recipeButtonClass(recipe), canDevOverride(recipe) ? 'border-[#b2c79a] bg-white/90 opacity-100 hover:-translate-y-0.5' : '']"
          :aria-disabled="!canActivateRecipe(recipe)"
          @click="handleStartRecipe(recipe, $event)"
        >
          <div class="h-6 w-6" aria-hidden="true">
            <GameIcon :icon="recipeIcon(recipe)" :alt="recipe.name" />
          </div>
          <span class="sr-only">{{ recipe.name }}</span>
        </button>
      </div>
    </div>

    <div v-if="showBuildSection" class="mt-4 rounded-xl bg-white/[0.28] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold text-white/[0.92]">{{ t("ui.build") }}</div>
        <span class="rounded-full bg-white/[0.18] px-3 py-1 text-xs font-bold text-white/[0.7]">
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
import { computed, ref, watch } from "vue";
import InventoryGrid from "./InventoryGrid.vue";
import GameIcon from "./GameIcon.vue";
import { useI18n } from "../i18n/index.js";

const props = defineProps({
  itemCards: { type: Array, required: true },
  ownedKinds: { type: Number, required: true },
  transferCaption: { type: String, required: true },
  transferDisabled: { type: Boolean, default: false },
  transferDisabledText: { type: String, default: "" },
  task: { type: Object, default: null },
  tasks: { type: Array, default: () => [] },
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
  isCraftOverrideActive: { type: Boolean, default: false },
  devCraftOverrideEnabled: { type: Boolean, default: false },
  showCraftSection: { type: Boolean, default: true },
  showBuildSection: { type: Boolean, default: false },
  buildCards: { type: Array, default: () => [] },
  buildTooltip: { type: Function, default: () => "" },
  buildButtonClass: { type: Function, default: () => "" },
  canPlaceStructure: { type: Function, default: () => false },
  itemActionsForItem: { type: Function, default: null },
});

const emit = defineEmits(["select-transfer", "select-item-action", "start-recipe", "start-building"]);

const { t } = useI18n();
const selectedItemId = ref(null);

const selectedItem = computed(() => props.itemCards.find((item) => item.id === selectedItemId.value) || null);
const selectedItemActions = computed(() => {
  if (!selectedItem.value || !props.itemActionsForItem) {
    return [];
  }
  return props.itemActionsForItem(selectedItem.value) || [];
});

watch(
  () => props.transferDisabled,
  () => {
    if (props.transferDisabled) {
      closeItemActions();
    }
  },
);

watch(
  () => props.transferCaption,
  () => {
    closeItemActions();
  },
);

function openItemActions(itemId) {
  if (props.transferDisabled) {
    return;
  }

  const item = props.itemCards.find((entry) => entry.id === itemId);
  const actions = props.itemActionsForItem ? (props.itemActionsForItem(item) || []) : [];
  if (actions.length === 0) {
    emit("select-transfer", itemId);
    return;
  }

  if (actions.length === 1) {
    emit("select-item-action", { itemId, actionId: actions[0].id });
    return;
  }

  selectedItemId.value = itemId;
}

function closeItemActions() {
  selectedItemId.value = null;
}

function selectItemAction(actionId) {
  if (!selectedItem.value) {
    return;
  }
  emit("select-item-action", { itemId: selectedItem.value.id, actionId });
  closeItemActions();
}

function canDevOverride(recipe) {
  return props.devCraftOverrideEnabled && props.isCraftOverrideActive && !props.canStartRecipe(recipe);
}

function canActivateRecipe(recipe) {
  return props.canStartRecipe(recipe) || canDevOverride(recipe);
}

function handleStartRecipe(recipe, event) {
  const ignoreRequirements = Boolean(props.devCraftOverrideEnabled && event?.altKey && !props.canStartRecipe(recipe));
  if (!props.canStartRecipe(recipe) && !ignoreRequirements) {
    return;
  }
  emit("start-recipe", { recipeId: recipe.id, ignoreRequirements });
}
</script>
