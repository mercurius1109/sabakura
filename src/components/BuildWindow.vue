<template>
  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <div class="grid grid-cols-[repeat(3,120px)] gap-3">
      <button
        v-for="building in buildCards"
        :key="building.id"
        type="button"
        class="relative flex h-[120px] w-[120px] flex-col justify-between rounded-2xl border px-3 py-3 text-left transition"
        :class="buildButtonClass(building)"
        :disabled="!canPlaceStructure(building.id)"
        @click="$emit('start-building', building.id)"
      >
        <div class="pr-2 text-xs font-bold leading-4 text-ink">{{ building.name }}</div>
        <div class="flex items-center justify-center text-4xl leading-none" aria-hidden="true">{{ building.icon }}</div>
        <div class="text-[10px] leading-4 text-muted">{{ formatList(building.costs) }}</div>
        <div class="self-end rounded-full bg-white/85 px-2 py-1 text-[10px] font-bold leading-none text-muted">
          {{ buildingStatus(building.id) }}
        </div>
      </button>
    </div>

    <div v-if="constructionSites.length > 0" class="mt-6">
      <div class="mb-3 text-sm font-bold text-ink">{{ t("ui.construction") }}</div>
      <div class="grid grid-cols-[repeat(3,120px)] gap-3">
        <button
          v-for="site in constructionSites"
          :key="`cancel-${site.id}`"
          type="button"
          class="relative flex h-[120px] w-[120px] flex-col justify-between rounded-2xl border border-[#d7c8b7] bg-white/90 px-3 py-3 text-left transition hover:-translate-y-0.5"
          @click="$emit('cancel-construction', site.structureId)"
        >
          <div class="pr-8 text-xs font-bold leading-4 text-ink">{{ site.name }}</div>
          <div class="flex items-center justify-center text-4xl leading-none" aria-hidden="true">{{ site.icon }}</div>
          <div class="text-[10px] leading-4 text-muted">{{ t("ui.remove") }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "../i18n/index.js";

defineProps({
  buildCards: { type: Array, required: true },
  buildButtonClass: { type: Function, required: true },
  canPlaceStructure: { type: Function, required: true },
  formatList: { type: Function, required: true },
  buildingStatus: { type: Function, required: true },
  constructionSites: { type: Array, required: true },
});

defineEmits(["start-building", "cancel-construction"]);

const { t } = useI18n();
</script>
