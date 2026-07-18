<template>
  <div class="relative isolate max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <InventoryActionGrid
      :caption="t('ui.container')"
      :empty-text="t('common.carryingNone')"
      :entries="storageTransferEntries"
      :disabled="!isPlayerAdjacentToStorage"
      :disabled-text="t('ui.moveNextToStorage')"
      @select="$emit('transfer-to-player', $event)"
    />

    <div class="mt-4 rounded-xl bg-white/[0.28] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold text-white/[0.92]">{{ t("ui.assignVillager") }}</div>
        <button
          type="button"
          class="rounded-lg bg-white/[0.42] px-3 py-1.5 text-sm font-bold text-moss backdrop-blur-sm transition hover:bg-moss hover:text-white"
          @click="openVillagerModal"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="assignedVillagers.length === 0" class="mt-3 text-sm text-white/[0.66]">
        {{ t("ui.noAssignedStations") }}
      </div>

      <div v-else class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
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
            @click.stop="$emit('remove-villager', villager.id)"
            @keydown.enter.stop.prevent="$emit('remove-villager', villager.id)"
            @keydown.space.stop.prevent="$emit('remove-villager', villager.id)"
          >
            <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </span>
          <div class="pr-5 text-xs font-bold leading-4 text-white/[0.92]">{{ villager.name }}</div>
          <div class="flex items-center justify-center text-3xl leading-none text-white/[0.8]" aria-hidden="true">{{ villagerIcon }}</div>
          <div class="self-end text-[10px] font-bold leading-4 text-white/[0.62]">{{ t("ui.storage") }}</div>
        </button>
      </div>
    </div>

    <div class="mt-4 rounded-xl bg-white/[0.28] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold text-white/[0.92]">{{ t("ui.storageTargets") }}</div>
        <button
          type="button"
          class="rounded-lg bg-white/[0.42] px-3 py-1.5 text-sm font-bold text-moss backdrop-blur-sm transition hover:bg-moss hover:text-white"
          @click="$emit('open-add-rule')"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="registeredStockRules.length === 0" class="mt-3 text-sm text-white/[0.66]">
        {{ t("ui.noStorageTargets") }}
      </div>

      <div v-else class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
        <button
          v-for="rule in registeredStockRules"
          :key="rule.id"
          type="button"
          :title="stockRuleTooltip(rule)"
          class="group relative flex h-[88px] w-[88px] items-center justify-center rounded-lg bg-white/[0.34] backdrop-blur-sm transition hover:-translate-y-0.5"
          :class="isTutorialTarget(rule.itemId) ? tutorialHighlightClass : ''"
          @click="$emit('open-edit-rule', rule)"
        >
          <span class="absolute left-1.5 top-1.5 max-w-[52px] truncate text-[10px] font-bold leading-4 text-white/[0.9]">
            {{ itemDefinitions[rule.itemId].name }}
          </span>
          <span
            role="button"
            tabindex="0"
            class="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1e8] text-[#b4491e] opacity-0 shadow-sm ring-1 ring-[#f2b899] transition group-hover:opacity-100"
            @click.stop="$emit('remove-rule', rule.id)"
            @keydown.enter.stop.prevent="$emit('remove-rule', rule.id)"
            @keydown.space.stop.prevent="$emit('remove-rule', rule.id)"
          >
            <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </span>
          <div class="h-12 w-12" aria-hidden="true">
            <GameIcon :icon="itemDefinitions[rule.itemId].icon" :alt="itemDefinitions[rule.itemId].name" />
          </div>
          <span class="absolute bottom-1 right-1 rounded-full bg-white/[0.82] px-1.5 text-[10px] font-bold leading-5 text-ambered backdrop-blur-sm">
            {{ t("ui.currentOfTarget", { current: inventory[rule.itemId], target: rule.target }) }}
          </span>
        </button>
      </div>
    </div>

    <WindowModalHost :modal="activeModal" :visible="isStorageModalVisible">
      <template v-if="activeModal?.type === 'add-stock-rule'">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold">{{ t("ui.addStorageTarget") }}</h3>
          <button type="button" class="text-sm font-bold text-white/[0.7]" @click="$emit('close-add-rule')">{{ t("ui.close") }}</button>
        </div>

        <div v-if="availableStockRules.length === 0" class="mt-4 text-sm text-white/[0.66]">
          {{ t("ui.allItemsRegistered") }}
        </div>

        <div v-else class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3">
          <button
            v-for="rule in availableStockRules"
            :key="rule.id"
            type="button"
            :title="itemDefinitions[rule.itemId].name"
            class="relative flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-white/[0.34] backdrop-blur-sm transition"
            :class="draftStockRuleId === rule.id
              ? 'border-moss shadow-[0_0_0_2px_rgba(45,106,79,0.25)]'
              : 'border-line hover:-translate-y-0.5'"
            @click="$emit('select-add-rule', rule.id)"
          >
            <span class="absolute left-1.5 top-1.5 max-w-[46px] truncate text-[10px] font-bold leading-4 text-white/[0.9]">
              {{ itemDefinitions[rule.itemId].name }}
            </span>
            <div class="h-[72px] w-[72px]" aria-hidden="true">
              <GameIcon :icon="itemDefinitions[rule.itemId].icon" :alt="itemDefinitions[rule.itemId].name" />
            </div>
          </button>
        </div>

        <label class="mt-4 grid gap-1 text-sm font-bold text-white/[0.7]">
          {{ t("ui.target") }}
          <input
            :value="draftStockRuleTarget"
            class="rounded-lg bg-white/[0.55] px-3 py-2 text-base text-ink"
            type="number"
            min="1"
            @input="$emit('update-add-target', Number($event.target.value))"
          >
        </label>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="amount in [-100, -10, -1, 1, 10, 100]"
            :key="`add-target-${amount}`"
            type="button"
            class="rounded-lg bg-white/[0.42] px-3 py-1.5 text-sm font-bold text-moss backdrop-blur-sm transition hover:bg-moss hover:text-white"
            @click="$emit('update-add-target', adjustTargetValue(draftStockRuleTarget, amount, 1))"
          >
            {{ amount > 0 ? `+${amount}` : amount }}
          </button>
        </div>

        <button
          type="button"
          class="mt-4 w-full rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss"
          :disabled="!canSubmitStockRule"
          @click="$emit('submit-add-rule')"
        >
          {{ t("ui.confirm") }}
        </button>
      </template>

      <template v-else-if="activeModal?.type === 'edit-stock-rule' && editingStockRule">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold">{{ itemDefinitions[editingStockRule.itemId].name }}</h3>
          <button type="button" class="text-sm font-bold text-white/[0.7]" @click="$emit('close-edit-rule')">{{ t("ui.close") }}</button>
        </div>

        <div class="mt-3 rounded-lg bg-white/[0.34] px-3 py-3 text-sm text-white/[0.74] backdrop-blur-sm">
          {{ t("ui.stockLine", { current: inventory[editingStockRule.itemId], expected: expectedStock(editingStockRule.itemId), status: stockRuleStatus(editingStockRule) }) }}
        </div>

        <label class="mt-4 grid gap-1 text-sm font-bold text-white/[0.7]">
          {{ t("ui.target") }}
          <input
            :value="editingStockRuleTarget"
            class="rounded-lg bg-white/[0.55] px-3 py-2 text-base text-ink"
            type="number"
            min="1"
            @input="$emit('update-edit-target', Number($event.target.value))"
          >
        </label>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="amount in [-100, -10, -1, 1, 10, 100]"
            :key="`edit-target-${amount}`"
            type="button"
            class="rounded-lg bg-white/[0.42] px-3 py-1.5 text-sm font-bold text-moss backdrop-blur-sm transition hover:bg-moss hover:text-white"
            @click="$emit('update-edit-target', adjustTargetValue(editingStockRuleTarget, amount, 1))"
          >
            {{ amount > 0 ? `+${amount}` : amount }}
          </button>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss"
            @click="$emit('submit-edit-rule')"
          >
            {{ t("ui.confirm") }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-white/[0.42] px-4 py-2.5 font-bold text-ambered backdrop-blur-sm transition hover:bg-ambered hover:text-white"
            @click="$emit('remove-rule', editingStockRule.id)"
          >
            {{ t("ui.remove") }}
          </button>
        </div>
      </template>

      <template v-else-if="activeModal?.type === 'assign-villager'">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold">{{ t("ui.assignVillager") }}</h3>
          <button type="button" class="text-sm font-bold text-white/[0.7]" @click="closeVillagerModal">{{ t("ui.close") }}</button>
        </div>

        <div v-if="availableVillagers.length === 0" class="mt-4 text-sm text-white/[0.66]">
          {{ t("ui.noVillagersAvailable") }}
        </div>

        <div v-else class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
          <button
            v-for="villager in availableVillagers"
            :key="villager.id"
            type="button"
            class="flex h-[88px] w-[88px] flex-col justify-between rounded-lg bg-white/[0.34] px-2 py-2 text-left backdrop-blur-sm transition hover:-translate-y-0.5"
            @click="handleAddVillager(villager.id)"
          >
            <div class="text-xs font-bold leading-4 text-white/[0.92]">{{ villager.name }}</div>
            <div class="flex items-center justify-center text-3xl leading-none text-white/[0.8]" aria-hidden="true">{{ villagerIcon }}</div>
            <div class="self-end max-w-full truncate text-[10px] font-bold leading-4 text-moss">
              {{ villagerAssignedStationLabel(villager) }}
            </div>
          </button>
        </div>
      </template>
    </WindowModalHost>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useWindowModalStack, useWindowModalStackContext } from "../composables/useWindowModalStack.js";
import InventoryActionGrid from "./InventoryActionGrid.vue";
import GameIcon from "./GameIcon.vue";
import WindowModalHost from "./WindowModalHost.vue";
import { useI18n } from "../i18n/index.js";

const props = defineProps({
  storageTransferEntries: { type: Array, required: true },
  assignedVillagers: { type: Array, required: true },
  availableVillagers: { type: Array, required: true },
  stationNameById: { type: Function, required: false, default: null },
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
  isTutorialTarget: { type: Function, required: true },
});

const emit = defineEmits([
  "transfer-to-player",
  "open-add-rule",
  "open-edit-rule",
  "remove-rule",
  "close-add-rule",
  "select-add-rule",
  "update-add-target",
  "submit-add-rule",
  "close-edit-rule",
  "update-edit-target",
  "submit-edit-rule",
  "add-villager",
  "remove-villager",
]);

const { t } = useI18n();
const modalStack = useWindowModalStackContext() || useWindowModalStack();
const { activeModal, openModal, removeModal, syncModal } = modalStack;
const villagerIcon = "\uD83E\uDDD1";
const isStorageModalVisible = computed(() => (
  activeModal.value?.type === "add-stock-rule"
  || activeModal.value?.type === "edit-stock-rule"
  || activeModal.value?.type === "assign-villager"
));

watch(
  () => props.showAddStockRuleModal,
  (isOpen) => {
    syncModal("add-stock-rule", isOpen);
  },
  { immediate: true },
);

watch(
  () => [props.showEditStockRuleModal, props.editingStockRule?.id],
  ([isOpen, ruleId]) => {
    syncModal("edit-stock-rule", isOpen, { ruleId });
  },
  { immediate: true },
);

function openVillagerModal() {
  openModal({ type: "assign-villager" });
}

function closeVillagerModal() {
  removeModal("assign-villager");
}

function handleAddVillager(villagerId) {
  closeVillagerModal();
  emit("add-villager", villagerId);
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
