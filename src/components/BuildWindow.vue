<template>
  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
    <div class="grid grid-cols-[repeat(3,120px)] gap-3">
      <button
        v-for="building in buildCards"
        :key="building.id"
        type="button"
        class="relative flex h-[120px] w-[120px] flex-col justify-between overflow-hidden rounded-2xl border px-3 py-3 text-left transition"
        :class="[buildButtonClass(building), canDevOverride(building.id) ? 'border-white/[0.2] bg-black/[0.4] hover:-translate-y-0.5 backdrop-blur-sm opacity-100' : '']"
        :aria-disabled="!canStartBuilding(building.id)"
        @click="handleStartBuilding(building.id, $event)"
      >
        <span
          v-if="!canStartBuilding(building.id)"
          class="pointer-events-none absolute right-2 top-2 z-20 text-[#a93a3a]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 16 16" class="h-5 w-5" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.75" />
            <path d="M4.5 11.5L11.5 4.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
          </svg>
        </span>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center p-2" aria-hidden="true">
          <div class="h-[120px] w-[120px]">
            <GameIcon :icon="building.icon" :alt="building.name" />
          </div>
        </div>
        <div
          class="relative z-10 pr-2 text-xs font-bold leading-4"
          :class="canStartBuilding(building.id) ? 'text-white/[0.96]' : 'text-white/[0.92]'"
        >
          {{ building.name }}
        </div>
        <div
          class="relative z-10 flex items-center justify-center text-4xl leading-none"
          :class="canStartBuilding(building.id) ? 'text-white/[0.9]' : 'text-white/[0.86]'"
          aria-hidden="true"
        >
        </div>
        <div
          class="relative z-10 text-[10px] leading-4"
          :class="canStartBuilding(building.id) ? 'text-white/[0.72]' : 'text-white/[0.66]'"
        >
          {{ formatList(building.costs) }}
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
          class="relative flex h-[120px] w-[120px] flex-col justify-between overflow-hidden rounded-xl border border-white/[0.12] bg-black/[0.34] px-3 py-3 text-left backdrop-blur-md transition hover:-translate-y-0.5"
          @click="$emit('cancel-construction', site.structureId)"
        >
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center p-2" aria-hidden="true">
            <div class="h-[120px] w-[120px]">
              <GameIcon :icon="site.icon" :alt="site.name" />
            </div>
          </div>
          <div class="relative z-10 pr-8 text-xs font-bold leading-4 text-white/[0.92]">{{ site.name }}</div>
          <div class="relative z-10 text-[10px] leading-4 text-white/[0.66]">{{ t("ui.remove") }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import GameIcon from "./GameIcon.vue";
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
