<template>
  <div>
    <div class="absolute left-4 top-4 z-10 flex gap-3">
      <button
        type="button"
        class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
        :class="highlightInventory ? tutorialHighlightClass : ''"
        @click="$emit('open-inventory')"
      >
        <span aria-hidden="true" class="text-2xl leading-none">&#x1F392;</span>
        <span class="text-xs font-bold text-ink">{{ t("ui.menuInventory") }}</span>
      </button>

      <button
        type="button"
        class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
        :class="highlightVillage ? tutorialHighlightClass : ''"
        @click="$emit('open-village')"
      >
        <span aria-hidden="true" class="text-2xl leading-none">&#x1F465;</span>
        <span class="text-xs font-bold text-ink">{{ t("ui.menuVillagers") }}</span>
      </button>

      <button
        type="button"
        class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
        :class="highlightCraft ? tutorialHighlightClass : ''"
        @click="$emit('open-craft')"
      >
        <span aria-hidden="true" class="text-2xl leading-none">&#x1F528;</span>
        <span class="text-xs font-bold text-ink">{{ t("ui.menuCraft") }}</span>
      </button>

      <button
        type="button"
        class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
        :class="highlightBuild ? tutorialHighlightClass : ''"
        @click="$emit('open-build')"
      >
        <span aria-hidden="true" class="text-2xl leading-none">&#x1F3D7;</span>
        <span class="text-xs font-bold text-ink">{{ t("ui.menuBuild") }}</span>
      </button>

      <button
        type="button"
        class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
        @click="$emit('toggle-log')"
      >
        <span aria-hidden="true" class="text-2xl leading-none">&#x2630;</span>
        <span class="text-xs font-bold text-ink">{{ t("ui.menuLog") }}</span>
      </button>

      <div class="flex items-center gap-2 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 shadow-panel backdrop-blur">
        <span class="text-xs font-bold text-ink">{{ t("ui.speed") }}</span>
        <button
          v-for="speed in gameSpeedOptions"
          :key="speed"
          type="button"
          class="rounded-full px-2 py-1 text-xs font-bold transition"
          :class="gameSpeed === speed ? 'bg-moss text-white' : 'bg-white/80 text-ink hover:bg-white'"
          @click="$emit('set-speed', speed)"
        >
          x{{ speed }}
        </button>
      </div>
    </div>

    <div v-if="!isTutorialDismissed" class="absolute left-4 top-28 z-10">
      <TutorialPanel
        :current-step="currentTutorialStep"
        :completed-count="completedTutorialSteps"
        :total-steps="totalTutorialSteps"
        :is-complete="isTutorialComplete"
        @dismiss="$emit('dismiss-tutorial')"
      />
    </div>

    <div class="absolute right-4 top-4 z-10 flex flex-col items-end gap-3">
      <div class="w-[220px] rounded-[24px] border border-white/50 bg-white/72 p-3 shadow-panel backdrop-blur">
        <div class="text-xs font-bold tracking-[0.18em] text-ink/70">{{ t("ui.minimap") }}</div>
        <div class="relative mt-2 aspect-square overflow-hidden rounded-2xl border border-white/60 bg-[linear-gradient(180deg,#c8db9d_0%,#98bd6c_100%)]">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.35),transparent_24%),radial-gradient(circle_at_70%_74%,rgba(255,255,255,0.18),transparent_18%)]"></div>
          <div class="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/25"></div>
          <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/25"></div>

          <div
            v-for="site in minimapConstructionSites"
            :key="`construction-${site.id}`"
            class="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6f5235] bg-[#d7b085]"
            :style="minimapMarkerStyle(site.x, site.y)"
            :title="site.name"
          ></div>

          <div
            v-for="structure in minimapStructures"
            :key="`structure-${structure.id}`"
            class="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-[#6f5235] bg-[#9f6e42]"
            :style="minimapMarkerStyle(structure.x, structure.y)"
            :title="structure.name"
          ></div>

          <div
            v-for="villager in minimapVillagers"
            :key="`villager-${villager.id}`"
            class="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-[#f4d67d]"
            :style="minimapMarkerStyle(villager.x, villager.y)"
            :title="villager.name"
          ></div>

          <div
            v-if="minimapPlayer"
            class="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2d6a4f] shadow-[0_0_0_3px_rgba(255,255,255,0.25)]"
            :style="{ left: '50%', top: '50%' }"
            :title="minimapPlayer.name"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="pendingBuildingPlacement" class="absolute left-1/2 top-4 z-10 -translate-x-1/2">
      <div class="flex items-center gap-3 rounded-full border border-white/60 bg-white/78 px-4 py-2 text-sm font-bold text-ink shadow-panel backdrop-blur">
        <span>{{ pendingBuildingPlacement.name }}</span>
        <button
          type="button"
          class="rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-muted transition hover:text-ink"
          @click="$emit('cancel-pending')"
        >
          {{ t("ui.cancel") }}
        </button>
      </div>
    </div>

    <div v-if="isLogWindowVisible" class="absolute bottom-4 right-4 z-10 w-[340px] max-w-[calc(100vw-2rem)] rounded-[26px] border border-white/40 bg-black/28 p-4 text-white shadow-panel backdrop-blur">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold tracking-[0.18em] text-white/80">{{ t("ui.logTitle") }}</div>
        <button type="button" class="text-xs font-bold text-white/80 transition hover:text-white" @click="$emit('clear-log')">
          {{ t("ui.clear") }}
        </button>
      </div>
      <div class="mt-3 max-h-[280px] overflow-auto pr-1">
        <div v-if="log.length === 0" class="text-sm text-white/70">{{ t("ui.noLogs") }}</div>
        <div v-for="entry in log" :key="entry.id" class="py-1 text-sm leading-6 text-white/90">
          {{ entry.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import TutorialPanel from "./TutorialPanel.vue";
import { useI18n } from "../i18n/index.js";

const props = defineProps({
  highlightInventory: { type: Boolean, default: false },
  highlightVillage: { type: Boolean, default: false },
  highlightCraft: { type: Boolean, default: false },
  highlightBuild: { type: Boolean, default: false },
  tutorialHighlightClass: { type: String, required: true },
  gameSpeedOptions: { type: Array, required: true },
  gameSpeed: { type: Number, required: true },
  isTutorialDismissed: { type: Boolean, required: true },
  currentTutorialStep: { type: Object, default: null },
  completedTutorialSteps: { type: Number, required: true },
  totalTutorialSteps: { type: Number, required: true },
  isTutorialComplete: { type: Boolean, required: true },
  pendingBuildingPlacement: { type: Object, default: null },
  isLogWindowVisible: { type: Boolean, required: true },
  log: { type: Array, required: true },
  minimapConstructionSites: { type: Array, default: () => [] },
  minimapPlayer: { type: Object, default: null },
  minimapStructures: { type: Array, default: () => [] },
  minimapVillagers: { type: Array, default: () => [] },
  worldHeight: { type: Number, required: true },
  worldWidth: { type: Number, required: true },
});

defineEmits([
  "open-inventory",
  "open-village",
  "open-craft",
  "open-build",
  "toggle-log",
  "set-speed",
  "dismiss-tutorial",
  "cancel-pending",
  "clear-log",
]);

const { t } = useI18n();

function minimapMarkerStyle(x, y) {
  const centerX = props.minimapPlayer?.x ?? 0;
  const centerY = props.minimapPlayer?.y ?? 0;
  const viewRange = Math.max(props.worldWidth, props.worldHeight);
  const halfRange = viewRange / 2;
  const relativeX = ((x - centerX) / halfRange) * 50;
  const relativeY = ((y - centerY) / halfRange) * 50;

  return {
    left: `${50 + relativeX}%`,
    top: `${50 + relativeY}%`,
  };
}
</script>
