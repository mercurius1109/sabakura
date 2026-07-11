<template>
  <div class="flex items-start justify-between gap-4 border-b border-line/70 px-4 py-4">
    <div class="min-w-0 pr-2">
      <div v-if="eyebrow" class="text-xs font-bold uppercase tracking-[0.24em] text-moss">
        {{ eyebrow }}
      </div>
      <h2 class="mt-2 text-3xl font-bold text-ink">{{ title }}</h2>
      <p v-if="description" class="mt-2 text-sm leading-6 text-muted">
        {{ description }}
      </p>
    </div>

    <button
      v-if="showClose"
      type="button"
      class="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-sm font-bold text-muted transition hover:text-ink"
      @click="$emit('close')"
    >
      {{ t("ui.close") }}
    </button>
  </div>
</template>

<script setup>
import { useI18n } from "../i18n/index.js";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  showClose: { type: Boolean, default: true },
});

defineEmits(["close"]);

const { t } = useI18n();
</script>
