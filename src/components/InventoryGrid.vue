<template>
  <section>
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-sm font-bold tracking-[0.08em] text-ink">{{ t("ui.inventory") }}</h2>
      <span class="text-xs font-bold text-muted">{{ ownedKinds }}</span>
    </div>

    <div v-if="slots.length === 0" class="text-sm text-muted">
      {{ t("common.carryingNone") }}
    </div>

    <div
      v-else
      class="grid grid-cols-[repeat(auto-fill,minmax(40px,40px))] gap-2"
    >
      <div
        v-for="slot in slots"
        :key="slot.key"
        :title="slot.name"
        class="flex h-10 w-10 items-center justify-center rounded-md border border-[#d6ccb8] bg-[#f3ecdf]"
      >
        <span class="text-xl leading-none" aria-hidden="true">{{ slot.icon }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "../i18n/index.js";

const { t } = useI18n();

const props = defineProps({
  itemCards: { type: Array, required: true },
  ownedKinds: { type: Number, required: true },
});

const slots = computed(() =>
  props.itemCards.flatMap((item) =>
    Array.from({ length: item.amount }, (_, index) => ({
      key: `${item.id}-${index + 1}`,
      name: item.name,
      icon: item.icon,
    })),
  ),
);
</script>
