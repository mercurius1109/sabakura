<template>
  <div>
    <div class="absolute left-4 top-4 z-10 flex gap-3">
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

    <div v-if="!isTutorialDismissed" class="absolute right-4 top-4 z-10">
      <TutorialPanel
        :current-step="currentTutorialStep"
        :completed-count="completedTutorialSteps"
        :total-steps="totalTutorialSteps"
        :is-complete="isTutorialComplete"
        @dismiss="$emit('dismiss-tutorial')"
      />
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

defineProps({
  highlightVillage: { type: Boolean, default: false },
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
});

defineEmits([
  "open-village",
  "open-build",
  "toggle-log",
  "set-speed",
  "dismiss-tutorial",
  "cancel-pending",
  "clear-log",
]);

const { t } = useI18n();
</script>
