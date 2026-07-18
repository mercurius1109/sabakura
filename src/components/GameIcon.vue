<template>
  <img
    v-if="isImageIcon"
    :src="icon"
    :alt="alt"
    class="h-full w-full object-contain"
    draggable="false"
  >
  <span v-else class="leading-none">{{ icon || fallback }}</span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  icon: { type: String, default: "" },
  alt: { type: String, default: "" },
  fallback: { type: String, default: "?" },
});

const isImageIcon = computed(() => {
  if (!props.icon || typeof props.icon !== "string") {
    return false;
  }

  return /^data:image\//i.test(props.icon)
    || /\.(png|webp|jpg|jpeg|gif|svg)(\?.*)?$/i.test(props.icon)
    || props.icon.startsWith("/assets/");
});
</script>
