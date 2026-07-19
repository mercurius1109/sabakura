<template>
  <div>
    <div class="absolute left-4 top-4 z-10 flex gap-3">
      <button
        id="inventory-menu-button"
        type="button"
        class="hud-glass hud-glass-hover flex w-20 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-white"
        :class="highlightInventory ? tutorialHighlightClass : ''"
        @click="$emit('open-inventory')"
      >
        <span aria-hidden="true" class="text-2xl leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">&#x1F392;</span>
        <span class="text-xs font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{{ t("ui.menuInventory") }}</span>
      </button>

      <button
        type="button"
        class="hud-glass hud-glass-hover flex w-20 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-white"
        :class="highlightVillage ? tutorialHighlightClass : ''"
        @click="$emit('open-village')"
      >
        <span aria-hidden="true" class="text-2xl leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">&#x1F465;</span>
        <span class="text-xs font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{{ t("ui.menuVillagers") }}</span>
      </button>

      <button
        type="button"
        class="hud-glass hud-glass-hover flex w-20 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-white"
        :class="highlightBuild ? tutorialHighlightClass : ''"
        @click="$emit('open-build')"
      >
        <span aria-hidden="true" class="text-2xl leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">&#x1F3D7;</span>
        <span class="text-xs font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{{ t("ui.menuBuild") }}</span>
      </button>

      <button
        type="button"
        class="hud-glass hud-glass-hover flex w-20 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-white"
        @click="$emit('toggle-log')"
      >
        <span aria-hidden="true" class="text-2xl leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">&#x2630;</span>
        <span class="text-xs font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{{ t("ui.menuLog") }}</span>
      </button>

      <div class="hud-glass flex items-center gap-2 rounded-xl px-3 py-2">
        <span class="text-xs font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{{ t("ui.speed") }}</span>
        <button
          v-for="speed in gameSpeedOptions"
          :key="speed"
          type="button"
          class="rounded-full px-2 py-1 text-xs font-bold transition"
          :class="gameSpeed === speed ? 'bg-moss text-white' : 'bg-black/[0.35] text-white hover:bg-black/[0.5]'"
          @click="$emit('set-speed', speed)"
        >
          x{{ speed }}
        </button>
      </div>

      <div v-if="showDevTools" class="hud-glass flex items-center gap-2 rounded-xl px-3 py-2">
        <span class="text-xs font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{{ t("ui.devAutoplay") }}</span>
        <button
          type="button"
          class="rounded-full px-2 py-1 text-xs font-bold transition"
          :class="devAutoplayEnabled ? 'bg-moss text-white' : 'bg-black/[0.35] text-white hover:bg-black/[0.5]'"
          @click="$emit('toggle-dev-autoplay')"
        >
          {{ devAutoplayEnabled ? t("ui.stop") : t("ui.start") }}
        </button>
        <button
          type="button"
          class="rounded-full bg-black/[0.35] px-2 py-1 text-xs font-bold text-white transition hover:bg-black/[0.5]"
          @click="$emit('run-dev-step')"
        >
          {{ t("ui.devStep") }}
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
      <div class="hud-glass-soft relative aspect-square w-[220px] overflow-hidden rounded-lg">
        <div class="absolute inset-0">
          <div class="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.25]"></div>
          <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/[0.25]"></div>

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
            class="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.8] bg-[#f4d67d]"
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
      <div class="flex items-center gap-3 rounded-xl bg-white/[0.78] px-4 py-2 text-sm font-bold text-ink shadow-panel backdrop-blur">
        <span>{{ pendingBuildingPlacement.name }}</span>
        <button
          type="button"
          class="rounded-lg bg-white/[0.9] px-3 py-1 text-xs font-bold text-muted transition hover:text-ink"
          @click="$emit('cancel-pending')"
        >
          {{ t("ui.cancel") }}
        </button>
      </div>
    </div>

    <button
      type="button"
      class="hud-glass absolute bottom-4 left-4 z-10 w-[260px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-left"
      @click="$emit('click-fullness', $event)"
    >
      <div>
        <div class="text-[11px] font-bold tracking-[0.16em] text-white/[0.62] drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]">{{ t("ui.fullness") }}</div>
        <div class="mt-1 text-2xl font-bold leading-none text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{{ playerFullnessPercent }}%</div>
      </div>
      <div class="mt-3 h-3.5 overflow-hidden rounded-lg bg-black/[0.26]">
        <div
          class="h-full rounded-full transition-[width]"
          :class="playerIsStarving ? 'bg-[#d96c3f]' : 'bg-gradient-to-r from-[#e7b64d] via-[#9bc667] to-[#2d6a4f]'"
          :style="{ width: `${playerFullnessPercent}%` }"
        ></div>
      </div>
    </button>

    <div v-if="isLogWindowVisible" class="hud-glass-strong absolute bottom-4 right-4 z-10 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-white">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-bold tracking-[0.18em] text-white/[0.8]">{{ t("ui.logTitle") }}</div>
        <button type="button" class="text-xs font-bold text-white/[0.8] transition hover:text-white" @click="$emit('clear-log')">
          {{ t("ui.clear") }}
        </button>
      </div>
      <div class="mt-3 max-h-[280px] overflow-auto pr-1">
        <div v-if="log.length === 0" class="text-sm text-white/[0.7]">{{ t("ui.noLogs") }}</div>
        <div v-for="entry in log" :key="entry.id" class="py-1 text-sm leading-6 text-white/[0.9]">
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
  playerFullness: { type: Number, required: true },
  playerMaxFullness: { type: Number, required: true },
  playerFullnessPercent: { type: Number, required: true },
  playerIsStarving: { type: Boolean, required: true },
  showDevTools: { type: Boolean, default: false },
  devAutoplayEnabled: { type: Boolean, default: false },
  worldHeight: { type: Number, required: true },
  worldWidth: { type: Number, required: true },
});

defineEmits([
  "open-inventory",
  "open-village",
  "open-build",
  "toggle-log",
  "set-speed",
  "dismiss-tutorial",
  "cancel-pending",
  "clear-log",
  "click-fullness",
  "toggle-dev-autoplay",
  "run-dev-step",
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
