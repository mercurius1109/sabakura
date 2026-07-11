<template>
  <div class="rounded-2xl border border-line bg-white/80 p-4">
    <div class="flex items-center justify-between gap-2">
      <div class="text-sm font-bold text-ink">{{ t("ui.currentTask") }}</div>
      <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
        {{ task ? phaseText(task.phase) : t("ui.idle") }}
      </span>
    </div>

    <div v-if="task" class="mt-3 rounded-xl border border-line bg-[#faf8f3] px-3 py-3">
      <div class="flex items-center justify-between gap-2 text-sm font-bold text-ink">
        <span>{{ taskLabel(task) }}</span>

        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">{{ t("ui.leftSeconds", { seconds: remainingSeconds(task) }) }}</span>

          <button
            v-if="onCancel"
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1e8] text-[#b4491e] shadow-sm ring-1 ring-[#f2b899] transition hover:bg-[#ffe3d3]"
            @click="onCancel(task.id)"
          >
            <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="mt-2 h-2.5 overflow-hidden rounded-full border border-[#c7bdad] bg-[#eee7dd]">
        <div
          class="h-full rounded-full bg-gradient-to-r from-leaf to-lime-600 transition-[width]"
          :style="{ width: `${taskProgress(task)}%` }"
        />
      </div>
    </div>

    <div v-else class="mt-3 text-sm text-muted">
      {{ t("ui.noActiveTask") }}
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "../i18n/index.js";

defineProps({
  task: { type: Object, default: null },
  taskLabel: { type: Function, required: true },
  taskProgress: { type: Function, required: true },
  remainingSeconds: { type: Function, required: true },
  onCancel: { type: Function, default: null },
});

const { t } = useI18n();

function phaseText(phase) {
  if (phase === "movingToTarget") {
    return t("taskPhase.movingToTarget");
  }
  if (phase === "working") {
    return t("taskPhase.working");
  }
  if (phase === "movingToStorage") {
    return t("taskPhase.movingToStorage");
  }
  return t("taskPhase.idle");
}
</script>
