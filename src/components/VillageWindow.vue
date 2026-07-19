<template>
  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <button
      type="button"
      class="rounded-xl bg-black/[0.34] px-4 py-2 text-sm font-normal text-white/[0.92] backdrop-blur-sm transition hover:bg-black/[0.46]"
      :class="highlightAddVillager ? tutorialHighlightClass : ''"
      @click="$emit('add-villager')"
    >
      {{ t("ui.addVillager") }}
    </button>

    <div class="mt-4 grid grid-cols-[repeat(3,120px)] gap-3">
      <button
        v-for="villager in villagers"
        :key="villager.id"
        type="button"
        class="relative flex h-[120px] w-[120px] flex-col justify-between rounded-xl border border-white/[0.12] bg-black/[0.34] px-3 py-3 text-left backdrop-blur-md transition hover:-translate-y-0.5"
        @click="$emit('select-villager', villager.id)"
      >
        <div class="pr-2 text-xs font-normal leading-4 text-white/[0.92]">{{ villager.name }}</div>
        <div class="flex items-center justify-center text-4xl leading-none text-white/[0.8]" aria-hidden="true">&#x1F9D1;</div>
        <div class="max-w-full truncate text-[10px] font-normal leading-4 text-white/[0.68]">
          {{ villagerStationsLabel(villager) }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "../i18n/index.js";

defineProps({
  villagers: { type: Array, required: true },
  villagerStationsLabel: { type: Function, required: true },
  highlightAddVillager: { type: Boolean, default: false },
  tutorialHighlightClass: { type: String, required: true },
});

defineEmits(["add-villager", "select-villager"]);

const { t } = useI18n();
</script>
