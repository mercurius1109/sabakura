<template>
  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <div class="grid grid-cols-[repeat(3,120px)] gap-3">
      <button
        v-for="building in buildCards"
        :key="building.id"
        type="button"
        class="relative flex h-[120px] w-[120px] flex-col justify-between rounded-2xl border px-3 py-3 text-left transition"
        :class="[buildButtonClass(building), canDevOverride(building.id) ? 'border-[#b2c79a] bg-white/90 hover:-translate-y-0.5' : '']"
        :aria-disabled="!canStartBuilding(building.id)"
        @click="handleStartBuilding(building.id, $event)"
      >
        <div class="pr-2 text-xs font-bold leading-4 text-white/[0.92]">{{ building.name }}</div>
        <div class="flex items-center justify-center text-4xl leading-none" aria-hidden="true">{{ building.icon }}</div>
        <div class="text-[10px] leading-4 text-white/[0.66]">{{ formatList(building.costs) }}</div>
        <div class="self-end rounded-full bg-white/[0.18] px-2 py-1 text-[10px] font-bold leading-none text-white/[0.72] backdrop-blur-sm">
          {{ buildingStatus(building.id) }}
        </div>
      </button>
    </div>

    <div v-if="constructionSites.length > 0" class="mt-6">
      <div class="mb-3 text-sm font-bold text-white/[0.92]">{{ t("ui.construction") }}</div>
      <div class="grid grid-cols-[repeat(3,120px)] gap-3">
        <button
          v-for="site in constructionSites"
          :key="`cancel-${site.id}`"
          type="button"
          class="relative flex h-[120px] w-[120px] flex-col justify-between rounded-xl bg-white/[0.28] px-3 py-3 text-left backdrop-blur-md transition hover:-translate-y-0.5"
          @click="$emit('cancel-construction', site.structureId)"
        >
          <div class="pr-8 text-xs font-bold leading-4 text-white/[0.92]">{{ site.name }}</div>
          <div class="flex items-center justify-center text-4xl leading-none" aria-hidden="true">{{ site.icon }}</div>
          <div class="text-[10px] leading-4 text-white/[0.66]">{{ t("ui.remove") }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "../i18n/index.js";

const props = defineProps({
  buildCards: { type: Array, required: true },
  buildButtonClass: { type: Function, required: true },
  canPlaceStructure: { type: Function, required: true },
  isBuildOverrideActive: { type: Boolean, default: false },
  devBuildOverrideEnabled: { type: Boolean, default: false },
  formatList: { type: Function, required: true },
  buildingStatus: { type: Function, required: true },
  constructionSites: { type: Array, required: true },
});

const emit = defineEmits(["start-building", "cancel-construction"]);

const { t } = useI18n();

function canDevOverride(structureId) {
  return props.devBuildOverrideEnabled && props.isBuildOverrideActive && !props.canPlaceStructure(structureId);
}

function canStartBuilding(structureId) {
  return props.canPlaceStructure(structureId) || canDevOverride(structureId);
}

function handleStartBuilding(structureId, event) {
  const ignoreRequirements = Boolean(props.devBuildOverrideEnabled && event?.altKey && !props.canPlaceStructure(structureId));
  if (!props.canPlaceStructure(structureId) && !ignoreRequirements) {
    return;
  }
  emit("start-building", { structureId, ignoreRequirements });
}
</script>
