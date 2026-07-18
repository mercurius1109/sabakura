<template>
  <section>
    <div class="mb-3 text-sm font-bold tracking-[0.08em] text-white/[0.92]">{{ caption }}</div>

    <div v-if="entries.length === 0" class="text-sm text-white/[0.66]">
      {{ emptyText }}
    </div>

    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3">
      <button
        v-for="entry in entries"
        :key="entry.id"
        type="button"
        :title="`${entry.name} x${entry.amount}`"
        :disabled="disabled"
        :class="disabled
          ? 'relative flex h-[72px] w-[72px] cursor-not-allowed items-center justify-center rounded-lg border border-[#d6ccb8] bg-[#f3ecdf] opacity-50'
          : 'relative flex h-[72px] w-[72px] items-center justify-center rounded-lg border border-[#d6ccb8] bg-[#f3ecdf] transition hover:-translate-y-0.5'"
        @click="handleSelect(entry.id)"
      >
        <div class="h-[72px] w-[72px]" aria-hidden="true">
          <GameIcon :icon="entry.icon" :alt="entry.name" />
        </div>
        <span
          v-if="entry.amount > 1"
          class="absolute bottom-0.5 right-0.5 rounded-full bg-white/[0.9] px-1 text-[10px] font-bold leading-4 text-ambered shadow-sm"
        >
          {{ entry.amount }}
        </span>
        <span class="sr-only">{{ entry.name }}</span>
      </button>
    </div>

    <div v-if="disabled && entries.length > 0 && disabledText" class="mt-3 text-sm text-white/[0.66]">
      {{ disabledText }}
    </div>
  </section>
</template>

<script setup>
import GameIcon from "./GameIcon.vue";

const props = defineProps({
  caption: { type: String, required: true },
  emptyText: { type: String, required: true },
  entries: { type: Array, required: true },
  disabled: { type: Boolean, default: false },
  disabledText: { type: String, default: "" },
});

const emit = defineEmits(["select"]);

function handleSelect(entryId) {
  if (!props.disabled) {
    emit("select", entryId);
  }
}
</script>
