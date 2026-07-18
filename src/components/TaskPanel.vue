<template>
  <div class="rounded-xl bg-white/[0.24] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md">
    <div class="flex items-center justify-between gap-2">
      <div class="text-sm font-bold text-white/[0.92]">{{ t("ui.currentTask") }}</div>
      <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
        {{ activeTask ? taskStateText(activeTask) : t("ui.idle") }}
      </span>
    </div>

    <div v-if="activeTask" class="mt-3 rounded-lg bg-white/[0.3] px-3 py-3 backdrop-blur-sm">
      <div class="flex items-center justify-between gap-2 text-sm font-bold text-white/[0.9]">
        <span>{{ taskDisplayText(activeTask) }}</span>

        <div class="flex items-center gap-2">
          <span class="text-xs text-white/[0.62]">{{ t("ui.leftSeconds", { seconds: remainingSeconds(activeTask) }) }}</span>

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

      <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e6dece]/85">
        <div
          class="h-full rounded-full bg-gradient-to-r from-leaf to-lime-600 transition-[width]"
          :style="{ width: `${taskProgress(activeTask)}%` }"
        />
      </div>
    </div>

    <div v-if="queuedTasks.length" class="mt-3 rounded-lg bg-white/[0.3] px-3 py-3 backdrop-blur-sm">
      <div class="text-xs font-bold uppercase tracking-[0.08em] text-white/[0.62]">{{ t("ui.queue") }}</div>
      <div class="mt-2 flex flex-col gap-2">
        <div
          v-for="queuedTask in queuedTasks"
          :key="queuedTask.id"
          class="rounded-lg bg-white/[0.22] px-3 py-2 text-sm font-bold text-white/[0.88] backdrop-blur-sm"
        >
          {{ taskDisplayText(queuedTask) }}
        </div>
      </div>
    </div>

    <div v-if="!activeTask && queuedTasks.length === 0" class="mt-3 text-sm text-white/[0.66]">
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

function taskStateText(task) {
  if (task?.kind === "move") {
    return t("taskPhase.movingToTarget");
  }
  return t("taskPhase.working");
}
</script>
