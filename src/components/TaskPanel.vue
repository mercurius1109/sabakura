<template>
  <div class="rounded-2xl border border-line bg-white/80 p-4">
    <div class="flex items-center justify-between gap-2">
      <div class="text-sm font-bold text-ink">{{ t("ui.currentTask") }}</div>
      <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
        {{ activeTask ? phaseText(activeTask.phase) : t("ui.idle") }}
      </span>
    </div>

    <div v-if="activeTask" class="mt-3 rounded-xl border border-line bg-[#faf8f3] px-3 py-3">
      <div class="flex items-center justify-between gap-2 text-sm font-bold text-ink">
        <span>{{ taskDisplayText(activeTask) }}</span>

        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">{{ t("ui.leftSeconds", { seconds: remainingSeconds(activeTask) }) }}</span>

          <button
            v-if="onCancel"
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1e8] text-[#b4491e] shadow-sm ring-1 ring-[#f2b899] transition hover:bg-[#ffe3d3]"
            @click="onCancel(activeTask.id)"
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
          :style="{ width: `${taskProgress(activeTask)}%` }"
        />
      </div>
    </div>

    <div v-if="queuedTasks.length" class="mt-3 rounded-xl border border-line bg-[#faf8f3] px-3 py-3">
      <div class="text-xs font-bold uppercase tracking-[0.08em] text-muted">{{ t("ui.queue") }}</div>
      <div class="mt-2 flex flex-col gap-2">
        <div
          v-for="queuedTask in queuedTasks"
          :key="queuedTask.id"
          class="rounded-lg border border-line/70 bg-white/70 px-3 py-2 text-sm font-bold text-ink"
        >
          {{ taskDisplayText(queuedTask) }}
        </div>
      </div>
    </div>

    <div v-if="!activeTask && queuedTasks.length === 0" class="mt-3 text-sm text-muted">
      {{ t("ui.noActiveTask") }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "../i18n/index.js";

const props = defineProps({
  task: { type: Object, default: null },
  tasks: { type: Array, default: () => [] },
  taskLabel: { type: Function, required: true },
  taskDisplayText: { type: Function, required: true },
  taskProgress: { type: Function, required: true },
  remainingSeconds: { type: Function, required: true },
  onCancel: { type: Function, default: null },
});

const { t } = useI18n();

const activeTask = computed(() => props.task || props.tasks[0] || null);
const queuedTasks = computed(() => {
  const tasks = Array.isArray(props.tasks) ? props.tasks : [];
  if (!activeTask.value) {
    return tasks;
  }
  return tasks.filter((task) => task?.id !== activeTask.value.id);
});

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
