<template>
  <section>
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-bold tracking-[0.08em] text-white/[0.92]">{{ caption || t("ui.inventory") }}</h2>
        <div v-if="subtitle" class="mt-1 text-xs font-bold text-white/[0.62]">{{ subtitle }}</div>
      </div>
      <span class="text-xs font-bold text-white/[0.62]">{{ ownedKinds }}</span>
    </div>

    <div v-if="slots.length === 0" class="text-sm text-white/[0.66]">
      {{ emptyText || t("common.carryingNone") }}
    </div>

    <div
      v-else
      class="grid grid-cols-[repeat(auto-fill,minmax(40px,40px))] gap-2"
    >
      <button
        v-for="slot in slots"
        :key="slot.key"
        type="button"
        :title="slot.name"
        :disabled="disabled"
        class="flex h-10 w-10 items-center justify-center rounded-md border border-[#d6ccb8] bg-[#f3ecdf]"
        :class="disabled
          ? 'cursor-not-allowed opacity-50'
          : clickable
            ? 'transition hover:-translate-y-0.5'
            : ''"
        @click="handleSelect(slot.itemId)"
      >
        <div class="h-6 w-6" aria-hidden="true">
          <GameIcon :icon="slot.icon" :alt="slot.name" />
        </div>
      </button>
    </div>

    <div v-if="disabled && slots.length > 0 && disabledText" class="mt-3 text-sm text-white/[0.66]">
      {{ disabledText }}
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "../i18n/index.js";
import GameIcon from "./GameIcon.vue";

const { t } = useI18n();

const props = defineProps({
  itemCards: { type: Array, required: true },
  ownedKinds: { type: Number, required: true },
  caption: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  emptyText: { type: String, default: "" },
  clickable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledText: { type: String, default: "" },
});
const emit = defineEmits(["select"]);

const slots = computed(() =>
  props.itemCards.flatMap((item) =>
    Array.from({ length: item.amount }, (_, index) => ({
      key: `${item.id}-${index + 1}`,
      itemId: item.id,
      name: item.name,
      icon: item.icon,
    })),
  ),
);

function handleSelect(itemId) {
  if (!props.clickable || props.disabled) {
    return;
  }
  emit("select", itemId);
}
</script>
