<template>
  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <InventoryActionGrid
      :caption="t('ui.container')"
      :empty-text="t('common.carryingNone')"
      :entries="storageTransferEntries"
      :disabled="!isPlayerAdjacentToStorage"
      :disabled-text="t('ui.moveNextToStorage')"
      @select="$emit('transfer-to-player', $event)"
    />

    <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold text-ink">{{ t("ui.storageTargets") }}</div>
        <button
          type="button"
          class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
          @click="$emit('open-add-rule')"
        >
          {{ t("ui.add") }}
        </button>
      </div>

      <div v-if="registeredStockRules.length === 0" class="mt-3 text-sm text-muted">
        {{ t("ui.noStorageTargets") }}
      </div>

      <div v-else class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
        <button
          v-for="rule in registeredStockRules"
          :key="rule.id"
          type="button"
          :title="stockRuleTooltip(rule)"
          class="group relative flex h-[88px] w-[88px] items-center justify-center rounded-xl border border-line bg-[#fffdf8] transition hover:-translate-y-0.5"
          :class="isTutorialTarget(rule.itemId) ? tutorialHighlightClass : ''"
          @click="$emit('open-edit-rule', rule)"
        >
          <span class="absolute left-1.5 top-1.5 max-w-[52px] truncate text-[10px] font-bold leading-4 text-ink">
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
          <span class="text-3xl leading-none" aria-hidden="true">{{ itemDefinitions[rule.itemId].icon }}</span>
          <span class="absolute bottom-1 right-1 rounded-full bg-white/90 px-1.5 text-[10px] font-bold leading-5 text-ambered">
            {{ t("ui.currentOfTarget", { current: inventory[rule.itemId], target: rule.target }) }}
          </span>
        </button>
      </div>
    </div>

    <div v-if="showAddStockRuleModal" class="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-4">
      <div class="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-panel">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold">{{ t("ui.addStorageTarget") }}</h3>
          <button type="button" class="text-sm font-bold text-muted" @click="$emit('close-add-rule')">{{ t("ui.close") }}</button>
        </div>

        <div v-if="availableStockRules.length === 0" class="mt-4 text-sm text-muted">
          {{ t("ui.allItemsRegistered") }}
        </div>

        <div v-else class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3">
          <button
            v-for="rule in availableStockRules"
            :key="rule.id"
            type="button"
            :title="itemDefinitions[rule.itemId].name"
            class="relative flex h-[72px] w-[72px] items-center justify-center rounded-xl border bg-[#fffdf8] transition"
            :class="draftStockRuleId === rule.id
              ? 'border-moss shadow-[0_0_0_2px_rgba(45,106,79,0.25)]'
              : 'border-line hover:-translate-y-0.5'"
            @click="$emit('select-add-rule', rule.id)"
          >
            <span class="absolute left-1.5 top-1.5 max-w-[46px] truncate text-[10px] font-bold leading-4 text-ink">
              {{ itemDefinitions[rule.itemId].name }}
            </span>
            <span class="text-3xl leading-none" aria-hidden="true">{{ itemDefinitions[rule.itemId].icon }}</span>
          </button>
        </div>

        <label class="mt-4 grid gap-1 text-sm font-bold text-muted">
          {{ t("ui.target") }}
          <input
            :value="draftStockRuleTarget"
            class="rounded-md border border-line bg-white px-3 py-2 text-base text-ink"
            type="number"
            min="1"
            @input="$emit('update-add-target', Number($event.target.value))"
          >
        </label>

        <button
          type="button"
          class="mt-4 w-full rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss"
          :disabled="!canSubmitStockRule"
          @click="$emit('submit-add-rule')"
        >
          {{ t("ui.confirm") }}
        </button>
      </div>
    </div>

    <div v-if="showEditStockRuleModal && editingStockRule" class="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-4">
      <div class="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-panel">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-bold">{{ itemDefinitions[editingStockRule.itemId].name }}</h3>
          <button type="button" class="text-sm font-bold text-muted" @click="$emit('close-edit-rule')">{{ t("ui.close") }}</button>
        </div>

        <div class="mt-3 rounded-md border border-line bg-[#fffdf8] px-3 py-3 text-sm text-muted">
          {{ t("ui.stockLine", { current: inventory[editingStockRule.itemId], expected: expectedStock(editingStockRule.itemId), status: stockRuleStatus(editingStockRule) }) }}
        </div>

        <label class="mt-4 grid gap-1 text-sm font-bold text-muted">
          {{ t("ui.target") }}
          <input
            :value="editingStockRuleTarget"
            class="rounded-md border border-line bg-white px-3 py-2 text-base text-ink"
            type="number"
            min="1"
            @input="$emit('update-edit-target', Number($event.target.value))"
          >
        </label>

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
            class="rounded-md border border-line bg-white px-4 py-2.5 font-bold text-ambered transition hover:bg-ambered hover:text-white"
            @click="$emit('remove-rule', editingStockRule.id)"
          >
            {{ t("ui.remove") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import InventoryActionGrid from "./InventoryActionGrid.vue";
import { useI18n } from "../i18n/index.js";

const props = defineProps({
  storageTransferEntries: { type: Array, required: true },
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

defineEmits([
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
]);

const { t } = useI18n();
</script>
