<template>
  <section ref="fieldRef" class="relative h-full min-h-[720px] overflow-hidden bg-[#dce8c8]" @click="emitFieldClick">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5),transparent_20%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.28),transparent_18%),linear-gradient(180deg,#bcd48e_0%,#9dc06f_52%,#83a95b_100%)]"></div>
    <div class="absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(180deg,rgba(112,154,70,0)_0%,rgba(103,145,63,0.18)_30%,rgba(93,123,56,0.78)_100%)]"></div>

    <div class="absolute left-[7%] top-[14%] h-20 w-20 rounded-full bg-white/20 blur-xl"></div>
    <div class="absolute right-[11%] top-[12%] h-24 w-24 rounded-full bg-white/15 blur-2xl"></div>

    <div class="absolute inset-0">
      <button
        v-for="node in resourceNodes"
        :key="node.id"
        type="button"
        class="flex items-center justify-center rounded-full transition hover:scale-105"
        :class="isTutorialTarget('field-resource', node.id) ? resourceHighlightClass : ''"
        :style="[fieldPositionStyle(node.x, node.y), resourceButtonStyle(node)]"
        :title="nodeTitle(node)"
        @click.stop="$emit('select-resource', node.id)"
      >
        <div :class="resourceIconClass(node)">{{ nodeIcon(node) }}</div>
      </button>

      <button
        v-for="site in constructionSites"
        :key="site.id"
        type="button"
        class="transition hover:scale-105"
        :class="isTutorialTarget('field-construction', site.structureId) ? cardHighlightClass : ''"
        :style="fieldPositionStyle(site.x, site.y)"
        @click.stop="$emit('select-construction', site.structureId)"
      >
        <div class="relative flex h-24 w-24 flex-col items-center justify-center rounded-2xl border border-[#73573c] bg-[#b89a73]/90 px-3 py-3 shadow-xl">
          <div class="text-center text-4xl leading-none">{{ site.icon || "?" }}</div>
          <div class="mt-1 text-center text-xs font-bold leading-4 text-white">{{ site.name }}</div>
          <div class="absolute bottom-2 left-3 right-3 h-2 overflow-hidden rounded-full bg-black/20">
            <div class="h-full rounded-full bg-[#f8e38f] transition-[width] duration-200" :style="{ width: `${site.progress || 0}%` }"></div>
          </div>
        </div>
      </button>

      <button
        v-for="structure in placedStructureNodes"
        :key="`placed-${structure.id}`"
        type="button"
        class="transition hover:scale-105"
        :class="isTutorialTarget('field-structure', structure.id) ? cardHighlightClass : ''"
        :style="fieldPositionStyle(structure.x, structure.y)"
        @click.stop="selectStructure(structure.id)"
      >
        <div class="flex h-24 w-24 flex-col items-center justify-center rounded-2xl border border-[#7f5636] bg-[#a87447] px-3 py-3 shadow-xl">
          <div class="text-center text-4xl leading-none">{{ structure.icon }}</div>
          <div class="mt-1 text-center text-xs font-bold leading-4 text-white">{{ structure.name }}</div>
        </div>
      </button>

      <button
        v-if="player"
        :key="player.id"
        type="button"
        class="pointer-events-none z-10 flex h-14 w-14 items-center justify-center rounded-full transition"
        :style="actorPositionStyle(player, 10)"
        :title="player.name"
      >
        <div class="text-center text-5xl leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.32)]">{{ playerIcon }}</div>
      </button>
      <div
        v-if="actorSpeechText(player)"
        :style="speechBubblePositionStyle(player?.renderX ?? player?.x ?? 0, (player?.renderY ?? player?.y ?? 0) - 62, 11)"
        class="pointer-events-none z-10"
      >
        <div class="relative rounded-2xl border border-[#d8c9b7] bg-white/95 px-3 py-2 text-xs font-bold leading-4 text-ink shadow-lg">
          {{ actorSpeechText(player) }}
          <div class="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#d8c9b7] bg-white/95"></div>
        </div>
      </div>
      <div
        v-if="playerTaskEntries.length"
        :style="taskStackPositionStyle(player?.renderX ?? player?.x ?? 0, (player?.renderY ?? player?.y ?? 0) + 48, 10)"
        class="pointer-events-none z-10 flex min-w-[120px] flex-col gap-1"
      >
        <div
          v-for="(taskEntry, index) in playerTaskEntries"
          :key="taskEntry.key || `player-task-${index}`"
          class="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold leading-4 text-ink shadow-md backdrop-blur"
          :style="taskEntryStyle(taskEntry)"
        >
          {{ taskEntry.text }}
        </div>
      </div>

      <div
        v-for="animation in inventoryFlyAnimations"
        :key="animation.id"
        class="pointer-events-none absolute z-30"
        :style="inventoryFlyAnimationStyle(animation)"
      >
        <div class="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/92 shadow-lg backdrop-blur">
          <span class="text-2xl leading-none">{{ animation.icon }}</span>
        </div>
      </div>

      <div
        v-for="animation in fieldTransferFlyAnimations"
        :key="animation.id"
        class="pointer-events-none absolute z-30"
        :style="fieldTransferFlyAnimationStyle(animation)"
      >
        <div class="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/92 shadow-lg backdrop-blur">
          <span class="text-xl leading-none">{{ animation.icon }}</span>
        </div>
      </div>

      <button
        v-for="villager in villagers"
        :key="villager.id"
        type="button"
        class="flex h-12 w-12 items-center justify-center rounded-full transition hover:scale-105"
        :style="actorPositionStyle(villager, 1)"
        :title="villager.name"
        @click.stop="$emit('select-villager', villager.id)"
      >
        <div class="text-center text-4xl leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.28)]">{{ villagerIcon }}</div>
      </button>
      <div
        v-for="villager in villagers"
        :key="`speech-${villager.id}`"
        v-show="actorSpeechText(villager)"
        :style="speechBubblePositionStyle(villager?.renderX ?? villager?.x ?? 0, (villager?.renderY ?? villager?.y ?? 0) - 56, 2)"
        class="pointer-events-none"
      >
        <div class="relative rounded-2xl border border-[#d8c9b7] bg-white/95 px-3 py-2 text-xs font-bold leading-4 text-ink shadow-lg">
          {{ actorSpeechText(villager) }}
          <div class="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#d8c9b7] bg-white/95"></div>
        </div>
      </div>
      <div
        v-for="villager in villagers"
        :key="`task-${villager.id}`"
        v-show="villagerTaskEntries(villager.id).length"
        :style="taskStackPositionStyle(villager?.renderX ?? villager?.x ?? 0, (villager?.renderY ?? villager?.y ?? 0) + 42, 1)"
        class="pointer-events-none flex min-w-[120px] flex-col gap-1"
      >
        <div
          v-for="(taskEntry, index) in villagerTaskEntries(villager.id)"
          :key="taskEntry.key || `${villager.id}-task-${index}`"
          class="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold leading-4 text-ink shadow-md backdrop-blur"
          :style="taskEntryStyle(taskEntry)"
        >
          {{ taskEntry.text }}
        </div>
      </div>

      <button
        v-if="pendingPlacement"
        type="button"
        class="absolute inset-0 z-20 cursor-crosshair bg-white/5"
        @click.stop="emitFieldClick"
      >
        <div class="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-ink shadow-lg backdrop-blur">
          {{ pendingPlacement.name }}
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { clampWorldPoint } from "../game/core/world.js";

const props = defineProps({
  resourceNodes: { type: Array, required: true },
  player: { type: Object, required: false, default: null },
  villagers: { type: Array, required: true },
  constructionSites: { type: Array, required: true },
  placedStructureNodes: { type: Array, required: true },
  itemDefinitions: { type: Object, required: true },
  currentPlayerTaskEntries: { type: Array, required: false, default: () => [] },
  inventoryFlyRequests: { type: Array, required: false, default: () => [] },
  fieldTransferFlyRequests: { type: Array, required: false, default: () => [] },
  pendingPlacement: { type: Object, required: false, default: null },
  currentTime: { type: Number, required: false, default: 0 },
  taskLabel: { type: Function, required: true },
  villagerTaskEntryMap: { type: Object, required: true },
  tutorialTargets: { type: Array, required: false, default: () => [] },
  worldWidth: { type: Number, required: true },
  worldHeight: { type: Number, required: true },
});

const emit = defineEmits([
  "field-click",
  "select-resource",
  "select-structure",
  "select-storage",
  "select-construction",
  "select-player",
  "select-villager",
]);

const treeIcon = "\uD83C\uDF32";
const playerIcon = "\uD83D\uDE42";
const villagerIcon = "\uD83E\uDDD1";
const resourceHighlightClass = "tutorial-highlight tutorial-highlight-round";
const cardHighlightClass = "tutorial-highlight tutorial-highlight-card";
const fieldRef = ref(null);
const viewportWidth = ref(1280);
const viewportHeight = ref(720);
const inventoryFlyAnimations = ref([]);
const seenInventoryFlyRequestIds = new Set();
const fieldTransferFlyAnimations = ref([]);
const seenFieldTransferFlyRequestIds = new Set();

const camera = computed(() => {
  const targetX = props.player?.renderX ?? props.player?.x ?? props.worldWidth / 2;
  const targetY = props.player?.renderY ?? props.player?.y ?? props.worldHeight / 2;
  const maxCameraX = Math.max(0, props.worldWidth - viewportWidth.value);
  const maxCameraY = Math.max(0, props.worldHeight - viewportHeight.value);

  return {
    x: Math.max(0, Math.min(maxCameraX, targetX - viewportWidth.value / 2)),
    y: Math.max(0, Math.min(maxCameraY, targetY - viewportHeight.value / 2)),
  };
});

const playerTaskEntries = computed(() => Array.isArray(props.currentPlayerTaskEntries) ? props.currentPlayerTaskEntries : []);
const villagerTaskEntryMap = computed(() => props.villagerTaskEntryMap || {});

function villagerTaskEntries(villagerId) {
  const entries = villagerTaskEntryMap.value?.[villagerId];
  return Array.isArray(entries) ? entries : [];
}

function taskEntryStyle(taskEntry) {
  const progress = Number(taskEntry?.progress);
  if (!Number.isFinite(progress) || progress <= 0) {
    return {
      backgroundColor: "rgba(255,255,255,0.78)",
    };
  }

  const clamped = Math.max(0, Math.min(100, progress));
  return {
    backgroundImage: `linear-gradient(90deg, rgba(148, 196, 91, 0.75) 0%, rgba(148, 196, 91, 0.75) ${clamped}%, rgba(255,255,255,0.78) ${clamped}%, rgba(255,255,255,0.78) 100%)`,
  };
}

function fieldPositionStyle(x, y, zIndex = null) {
  return {
    position: "absolute",
    left: `${x - camera.value.x}px`,
    top: `${y - camera.value.y}px`,
    transform: "translate(-50%, -50%)",
    ...(zIndex === null ? {} : { zIndex }),
  };
}

function actorPositionStyle(actor, zIndex = null) {
  return fieldPositionStyle(actor?.renderX ?? actor?.x ?? 0, actor?.renderY ?? actor?.y ?? 0, zIndex);
}

function taskStackPositionStyle(x, y, zIndex = null) {
  return {
    position: "absolute",
    left: `${x - camera.value.x}px`,
    top: `${y - camera.value.y}px`,
    transform: "translateX(-50%)",
    ...(zIndex === null ? {} : { zIndex }),
  };
}

function speechBubblePositionStyle(x, y, zIndex = null) {
  return {
    position: "absolute",
    left: `${x - camera.value.x}px`,
    top: `${y - camera.value.y}px`,
    transform: "translate(-50%, -100%)",
    ...(zIndex === null ? {} : { zIndex }),
  };
}

function actorSpeechText(actor) {
  if (!actor?.speechText) {
    return "";
  }
  return actor.speechUntil > props.currentTime ? actor.speechText : "";
}

function inventoryFlyAnimationStyle(animation) {
  return {
    left: `${animation.active ? animation.endX : animation.startX}px`,
    top: `${animation.active ? animation.endY : animation.startY}px`,
    transform: `translate(-50%, -50%) scale(${animation.active ? 0.45 : 1})`,
    opacity: animation.active ? 0.2 : 1,
    transition: "left 650ms cubic-bezier(0.22, 1, 0.36, 1), top 650ms cubic-bezier(0.22, 1, 0.36, 1), transform 650ms cubic-bezier(0.22, 1, 0.36, 1), opacity 650ms ease-in",
  };
}

function fieldTransferFlyAnimationStyle(animation) {
  return {
    left: `${animation.active ? animation.endX : animation.startX}px`,
    top: `${animation.active ? animation.endY : animation.startY}px`,
    transform: "translate(-50%, -50%) scale(0.9)",
    opacity: animation.active ? 0.25 : 1,
    transition: "left 520ms cubic-bezier(0.22, 1, 0.36, 1), top 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms ease-in",
  };
}

function syncInventoryFlyRequests() {
  props.inventoryFlyRequests.forEach((request) => {
    if (!request?.id || seenInventoryFlyRequestIds.has(request.id)) {
      return;
    }
    seenInventoryFlyRequestIds.add(request.id);
    startInventoryFlyAnimation(request);
  });
}

function syncFieldTransferFlyRequests() {
  props.fieldTransferFlyRequests.forEach((request) => {
    if (!request?.id || seenFieldTransferFlyRequestIds.has(request.id)) {
      return;
    }
    seenFieldTransferFlyRequestIds.add(request.id);
    startFieldTransferFlyAnimation(request);
  });
}

function startInventoryFlyAnimation(request) {
  if (!fieldRef.value) {
    return;
  }

  const targetButton = document.getElementById("inventory-menu-button");
  if (!targetButton) {
    return;
  }

  const fieldRect = fieldRef.value.getBoundingClientRect();
  const targetRect = targetButton.getBoundingClientRect();
  const amount = Math.max(1, Number(request.amount) || 1);
  const icon = props.itemDefinitions[request.itemId]?.icon || "?";
  const baseStartX = request.originX - camera.value.x;
  const baseStartY = request.originY - camera.value.y;
  const endX = targetRect.left - fieldRect.left + targetRect.width / 2;
  const endY = targetRect.top - fieldRect.top + targetRect.height / 2;

  Array.from({ length: amount }, (_, index) => {
    const spreadX = (index % 3 - 1) * 10;
    const spreadY = Math.floor(index / 3) * 8;
    const animation = {
      id: `${request.id}-${index}`,
      icon,
      startX: baseStartX + spreadX,
      startY: baseStartY + spreadY,
      endX,
      endY,
      active: false,
    };

    inventoryFlyAnimations.value.push(animation);
    window.setTimeout(() => {
      nextTick(() => {
        requestAnimationFrame(() => {
          animation.active = true;
          window.setTimeout(() => {
            const animationIndex = inventoryFlyAnimations.value.findIndex((entry) => entry.id === animation.id);
            if (animationIndex >= 0) {
              inventoryFlyAnimations.value.splice(animationIndex, 1);
            }
          }, 700);
        });
      });
    }, index * 60);
  });
}

function actorPosition(actorId) {
  if (props.player?.id === actorId) {
    return {
      x: props.player?.renderX ?? props.player?.x ?? 0,
      y: props.player?.renderY ?? props.player?.y ?? 0,
    };
  }

  const villager = props.villagers.find((entry) => entry.id === actorId);
  if (!villager) {
    return null;
  }
  return {
    x: villager.renderX ?? villager.x ?? 0,
    y: villager.renderY ?? villager.y ?? 0,
  };
}

function storagePosition() {
  const storageNode = props.placedStructureNodes.find((entry) => entry.id === "storage");
  if (!storageNode) {
    return null;
  }
  return { x: storageNode.x, y: storageNode.y };
}

function structurePosition(structureId) {
  const structureNode = props.placedStructureNodes.find((entry) => entry.id === structureId);
  if (!structureNode) {
    return null;
  }
  return { x: structureNode.x, y: structureNode.y };
}

function flyEndpointPosition(endpoint) {
  if (!endpoint) {
    return null;
  }
  if (endpoint.kind === "actor") {
    return actorPosition(endpoint.actorId);
  }
  if (endpoint.kind === "storage") {
    return storagePosition();
  }
  if (endpoint.kind === "station") {
    return structurePosition(endpoint.stationId);
  }
  return null;
}

function startFieldTransferFlyAnimation(request) {
  const from = flyEndpointPosition(request.from);
  const to = flyEndpointPosition(request.to);
  if (!from || !to) {
    return;
  }

  const amount = Math.max(1, Number(request.amount) || 1);
  const icon = props.itemDefinitions[request.itemId]?.icon || "?";
  Array.from({ length: amount }, (_, index) => {
    const spreadX = (index % 3 - 1) * 8;
    const spreadY = Math.floor(index / 3) * 6;
    const animation = {
      id: `${request.id}-${index}`,
      icon,
      startX: from.x - camera.value.x + spreadX,
      startY: from.y - camera.value.y + spreadY,
      endX: to.x - camera.value.x,
      endY: to.y - camera.value.y,
      active: false,
    };

    fieldTransferFlyAnimations.value.push(animation);
    window.setTimeout(() => {
      nextTick(() => {
        requestAnimationFrame(() => {
          animation.active = true;
          window.setTimeout(() => {
            const animationIndex = fieldTransferFlyAnimations.value.findIndex((entry) => entry.id === animation.id);
            if (animationIndex >= 0) {
              fieldTransferFlyAnimations.value.splice(animationIndex, 1);
            }
          }, 560);
        });
      });
    }, index * 50);
  });
}

function nodeIcon(node) {
  if (node.type === "tree") {
    return treeIcon;
  }

  return props.itemDefinitions[node.itemId]?.icon || "?";
}

function nodeTitle(node) {
  return node.title || props.itemDefinitions[node.itemId]?.name || "";
}

function isTreeNode(node) {
  return node?.type === "tree";
}

function isRockNode(node) {
  return node?.type === "rock";
}

function resourceButtonStyle(node) {
  if (isRockNode(node)) {
    return {
      width: "4.5rem",
      height: "4.5rem",
    };
  }

  return isTreeNode(node)
    ? {
      width: "3rem",
      height: "3rem",
    }
    : {
      width: "3rem",
      height: "3rem",
    };
}

function resourceIconClass(node) {
  if (isRockNode(node)) {
    return "text-center text-6xl leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.28)]";
  }

  return isTreeNode(node)
    ? "text-center text-4xl leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.28)]"
    : "text-center text-4xl leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.28)]";
}

function isTutorialTarget(kind, id) {
  return props.tutorialTargets.some((target) => target.kind === kind && target.id === id);
}

function emitFieldClick(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const point = clampWorldPoint(
    {
      x: event.clientX - rect.left + camera.value.x,
      y: event.clientY - rect.top + camera.value.y,
    },
    props.worldWidth,
    props.worldHeight,
  );
  emit("field-click", {
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2)),
  });
}

function selectStructure(structureId) {
  if (structureId === "storage") {
    return emit("select-storage");
  }
  return emit("select-structure", structureId);
}

function updateViewport() {
  if (!fieldRef.value) {
    return;
  }
  const rect = fieldRef.value.getBoundingClientRect();
  viewportWidth.value = rect.width || viewportWidth.value;
  viewportHeight.value = rect.height || viewportHeight.value;
}

onMounted(() => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
  syncInventoryFlyRequests();
  syncFieldTransferFlyRequests();
});

onUnmounted(() => {
  window.removeEventListener("resize", updateViewport);
});

watch(() => props.inventoryFlyRequests, () => {
  syncInventoryFlyRequests();
}, { deep: true });

watch(() => props.fieldTransferFlyRequests, () => {
  syncFieldTransferFlyRequests();
}, { deep: true });
</script>
