<template>
  <section>
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-bold tracking-[0.08em] text-white/[0.92]">{{ caption || t("ui.inventory") }}</h2>
        <div v-if="subtitle" class="mt-1 text-xs font-bold text-white/[0.62]">{{ subtitle }}</div>
      </div>
    </div>

    <div v-if="slots.length === 0" class="text-sm text-white/[0.66]">
      {{ emptyText || t("common.carryingNone") }}
    </div>

    <div
      v-else
      class="grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3"
    >
      <button
        v-for="slot in slots"
        :key="slot.key"
        type="button"
        :title="slot.name"
        :disabled="disabled"
        class="relative flex h-[72px] w-[72px] items-center justify-center rounded-lg border border-white/[0.12] bg-black/[0.34] backdrop-blur-sm"
        :class="disabled
          ? 'cursor-not-allowed'
          : clickable
            ? 'transition hover:-translate-y-0.5'
            : ''"
        @click="handleSelect(slot.itemId)"
      >
        <span
          v-if="disabled"
          class="pointer-events-none absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/[0.68] text-[10px] leading-none text-white/[0.92]"
          aria-hidden="true"
        >
          ⃠
        </span>
        <span class="pointer-events-none absolute left-1.5 top-1.5 z-10 max-w-[46px] truncate text-[10px] font-bold leading-4 text-white/[0.92]">
          {{ slot.name }}
        </span>
        <div class="flex h-[72px] w-[72px] items-center justify-center p-2" aria-hidden="true">
          <GameIcon :icon="slot.icon" :alt="slot.name" />
        </div>
        <span
          v-if="slot.stackable && slot.amount > 1"
          class="pointer-events-none absolute bottom-0.5 right-1 z-10 text-[10px] font-normal leading-4 text-white/[0.92]"
        >
          ×{{ slot.amount }}
        </span>
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
  props.itemCards.flatMap((item) => {
    if (item.amount <= 0) {
      return [];
    }

    if (item.stackable !== false) {
      return [{
        key: item.id,
        itemId: item.id,
        name: item.name,
        icon: item.icon,
        amount: item.amount,
        stackable: true,
      }];
    }

    return Array.from({ length: item.amount }, (_, index) => ({
      key: `${item.id}-${index + 1}`,
      itemId: item.id,
      name: item.name,
      icon: item.icon,
      amount: 1,
      stackable: false,
    }));
  }),
);

function handleSelect(itemId) {
  if (!props.clickable || props.disabled) {
    return;
  }
  emit("select", itemId);
}
</script>
