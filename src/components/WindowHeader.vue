<template>
  <div class="flex items-start justify-between gap-4 border-b border-white/[0.04] px-4 py-4">
    <div class="min-w-0 pr-2">
      <div v-if="eyebrow" class="text-xs font-bold uppercase tracking-[0.24em] text-[#d8f0b6]">
        {{ eyebrow }}
      </div>
      <h2 class="mt-2 text-3xl font-bold text-white/[0.95]">{{ title }}</h2>
    </div>

    <button
      v-if="showClose"
      type="button"
      :aria-label="t('ui.close')"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-lg font-bold leading-none text-white/[0.72] backdrop-blur-md transition hover:bg-white/[0.16] hover:text-white"
      @click="$emit('close')"
    >
      ✗
    </button>
  </div>
</template>

<script setup>
import { useI18n } from "../i18n/index.js";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  showClose: { type: Boolean, default: true },
});

defineEmits(["close"]);

const { t } = useI18n();
</script>
