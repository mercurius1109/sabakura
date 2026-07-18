<template>
  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <button
      type="button"
      class="rounded-xl bg-white/[0.34] px-4 py-2 text-sm font-bold text-white/[0.92] backdrop-blur-sm transition hover:bg-white/[0.46]"
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
        class="relative flex h-[120px] w-[120px] flex-col justify-between rounded-xl bg-white/[0.28] px-3 py-3 text-left backdrop-blur-md transition hover:-translate-y-0.5"
        @click="$emit('select-villager', villager.id)"
      >
        <div class="pr-10 text-xs font-bold leading-4 text-white/[0.92]">{{ villager.name }}</div>
        <div class="flex items-center justify-center text-4xl leading-none text-white/[0.8]" aria-hidden="true">&#x1F9D1;</div>
        <div class="flex items-end justify-between gap-2">
          <span class="max-w-[56px] truncate text-[10px] font-bold leading-4 text-white/[0.62]">
            {{ villagerStationsLabel(villager) }}
          </span>
          <span class="rounded-full px-2 py-1 text-[10px] font-bold leading-none" :class="(villager.currentTaskId || villager.taskQueue?.length) ? 'bg-orange-100 text-ambered' : 'bg-emerald-100 text-moss'">
            {{ (villager.currentTaskId || villager.taskQueue?.length) ? t("ui.busy") : t("ui.idle") }}
          </span>
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
