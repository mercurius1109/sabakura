<template>
  <aside class="w-[340px] max-w-[calc(100vw-2rem)] rounded-[26px] border border-white/50 bg-white/72 p-4 shadow-panel backdrop-blur">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="text-xs font-bold tracking-[0.18em] text-moss">{{ t("tutorial.panel.title") }}</div>
        <div class="mt-1 text-sm font-bold text-ink">
          {{ t("tutorial.panel.stepCounter", { current: displayStep, total: totalSteps }) }}
        </div>
      </div>
      <div
        class="rounded-full px-3 py-1 text-xs font-bold"
        :class="isComplete ? 'bg-emerald-100 text-moss' : 'bg-stone-100 text-muted'"
      >
        {{ isComplete ? t("tutorial.panel.complete") : t("tutorial.panel.inProgress") }}
      </div>
    </div>

    <div v-if="currentStep" class="mt-4">
      <h2 class="text-xl font-bold text-ink">{{ currentStep.title }}</h2>
      <p class="mt-2 text-sm leading-6 text-muted">{{ currentStep.description }}</p>
      <p v-if="currentStep.highlightTargets?.length" class="mt-3 text-sm leading-6 text-moss">
        {{ t("tutorial.panel.highlightHint") }}
      </p>

      <div v-if="remainingRequirements.length > 0" class="mt-4 rounded-2xl border border-line bg-[#faf8f3] p-3">
        <div class="text-xs font-bold tracking-[0.12em] text-muted">{{ t("tutorial.panel.requirements") }}</div>
        <div class="mt-3 grid gap-2">
          <div
            v-for="requirement in remainingRequirements"
            :key="requirement.itemId || requirement.label"
            class="flex items-center justify-between gap-3 text-sm"
          >
            <span class="font-bold text-ink">{{ requirement.label }}</span>
            <span class="text-muted">
              {{ requirement.current }} / {{ requirement.needed }}
              <span class="font-bold text-ambered">(+{{ requirement.remaining }})</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="mt-4 rounded-2xl border border-line bg-[#faf8f3] p-4">
      <div class="text-lg font-bold text-ink">{{ t("tutorial.panel.completeTitle") }}</div>
      <p class="mt-2 text-sm leading-6 text-muted">
        {{ t("tutorial.panel.completeDescription") }}
      </p>
      <button
        type="button"
        class="mt-4 rounded-2xl bg-moss px-4 py-2 text-sm font-bold text-white transition hover:bg-leaf"
        @click="$emit('dismiss')"
      >
        {{ t("tutorial.panel.dismiss") }}
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "../i18n/index.js";

const { t } = useI18n();

const props = defineProps({
  currentStep: { type: Object, default: null },
  completedCount: { type: Number, required: true },
  totalSteps: { type: Number, required: true },
  isComplete: { type: Boolean, required: true },
});

defineEmits(["dismiss"]);

const displayStep = computed(() => (
  props.isComplete ? props.totalSteps : Math.min(props.completedCount + 1, props.totalSteps)
));

const remainingRequirements = computed(() => (
  (props.currentStep?.requirements || []).filter((requirement) => requirement.remaining > 0)
));
</script>
