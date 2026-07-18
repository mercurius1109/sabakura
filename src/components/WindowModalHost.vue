<template>
  <Teleport to="#window-modal-root">
    <div
      v-if="visible && modal"
      class="pointer-events-none fixed left-1/2 top-24 z-[60] flex h-[calc(100vh-7rem)] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 items-center justify-center p-4"
    >
      <div :class="['pointer-events-auto', panelClass]">
        <slot :modal="modal" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  modal: { type: Object, default: null },
  visible: { type: Boolean, default: true },
  panelClass: {
    type: String,
    default: "w-full max-w-md rounded-xl border border-white/[0.12] bg-white/[0.14] p-4 shadow-[0_24px_48px_rgba(12,16,10,0.22)] backdrop-blur-xl",
  },
});
</script>
