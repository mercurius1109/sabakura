<template>
  <section ref="fieldRef" class="relative h-full min-h-[720px] overflow-hidden bg-[#dce8c8]" @click="emitFieldClick">
    <div class="absolute inset-0" :style="grassBaseStyle"></div>
    <div class="absolute inset-0 opacity-55 mix-blend-multiply" :style="grassOverlayStyle"></div>

    <div class="absolute inset-0">
      <div
        v-for="node in treeResourceNodes"
        :key="node.id"
      >
        <div class="pointer-events-none" :style="treeVisualStyle(node)">
          <GameIcon :icon="nodeIcon(node)" :alt="nodeTitle(node)" />
        </div>
        <button
          type="button"
          class="absolute rounded-full transition hover:scale-105"
          :class="isTutorialTarget('field-resource', node.id) ? resourceHighlightClass : ''"
          :style="[fieldPositionStyle(node.x, node.y), treeHitStyle()]"
          :title="nodeTitle(node)"
          @click.stop="$emit('select-resource', node.id)"
        />
      </div>

      <button
        v-for="node in nonTreeResourceNodes"
        :key="node.id"
        type="button"
        class="flex items-center justify-center rounded-full transition hover:scale-105"
        :class="isTutorialTarget('field-resource', node.id) ? resourceHighlightClass : ''"
        :style="[fieldPositionStyle(node.x, node.y), resourceButtonStyle(node)]"
        :title="nodeTitle(node)"
        @click.stop="$emit('select-resource', node.id)"
      >
        <div :class="resourceIconClass(node)">
          <GameIcon :icon="nodeIcon(node)" :alt="nodeTitle(node)" />
        </div>
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
        <div class="relative flex w-24 flex-col items-center justify-center gap-2">
          <div class="h-24 w-24 drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)] opacity-80">
            <GameIcon :icon="site.icon || '?'" :alt="site.name || ''" />
          </div>
          <div class="w-20 overflow-hidden rounded-full bg-black/[0.22]">
            <div class="h-2 rounded-full bg-[#f8e38f] transition-[width] duration-200" :style="{ width: `${site.progress || 0}%` }"></div>
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
        <div class="h-24 w-24 drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)]">
          <GameIcon :icon="structure.icon || '?'" :alt="structure.name || ''" />
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
        <div class="relative rounded-2xl border border-[#d8c9b7] bg-white/[0.95] px-3 py-2 text-xs font-bold leading-4 text-ink shadow-lg">
          {{ actorSpeechText(player) }}
          <div class="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#d8c9b7] bg-white/[0.95]"></div>
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
          class="whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold leading-4 text-white shadow-[0_6px_14px_rgba(0,0,0,0.18)] backdrop-blur-md"
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
        <div class="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.7] bg-white/[0.92] shadow-lg backdrop-blur">
          <div class="h-6 w-6">
            <GameIcon :icon="animation.icon" alt="" />
          </div>
        </div>
      </div>

      <div
        v-for="animation in fieldTransferFlyAnimations"
        :key="animation.id"
        class="pointer-events-none absolute z-30"
        :style="fieldTransferFlyAnimationStyle(animation)"
      >
        <div class="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.7] bg-white/[0.92] shadow-lg backdrop-blur">
          <div class="h-5 w-5">
            <GameIcon :icon="animation.icon" alt="" />
          </div>
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
        <div class="relative rounded-2xl border border-[#d8c9b7] bg-white/[0.95] px-3 py-2 text-xs font-bold leading-4 text-ink shadow-lg">
          {{ actorSpeechText(villager) }}
          <div class="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#d8c9b7] bg-white/[0.95]"></div>
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
          class="whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold leading-4 text-white shadow-[0_6px_14px_rgba(0,0,0,0.18)] backdrop-blur-md"
          :style="taskEntryStyle(taskEntry)"
        >
          {{ taskEntry.text }}
        </div>
      </div>

      <button
        v-if="pendingPlacement"
        type="button"
        class="absolute inset-0 z-20 cursor-crosshair bg-white/[0.05]"
        @click.stop="emitFieldClick"
      >
        <div class="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/[0.7] bg-white/[0.8] px-4 py-2 text-sm font-bold text-ink shadow-lg backdrop-blur">
          {{ pendingPlacement.name }}
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import GameIcon from "./GameIcon.vue";
import grassTile1 from "../assets/tiles/grass-1.png";
import grassTile2 from "../assets/tiles/grass-2.png";
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

const playerIcon = "\uD83D\uDE42";
const villagerIcon = "\uD83E\uDDD1";
const resourceHighlightClass = "tutorial-highlight-resource";
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
const treeResourceNodes = computed(() => props.resourceNodes.filter((node) => isTreeNode(node)));
const nonTreeResourceNodes = computed(() => props.resourceNodes.filter((node) => !isTreeNode(node)));
const grassBaseStyle = computed(() => ({
  backgroundImage: `url(${grassTile1})`,
  backgroundRepeat: "repeat",
  backgroundSize: "64px 64px",
  backgroundPosition: `${-camera.value.x}px ${-camera.value.y}px`,
  imageRendering: "auto",
}));
const grassOverlayStyle = computed(() => ({
  backgroundImage: `url(${grassTile2})`,
  backgroundRepeat: "repeat",
  backgroundSize: "64px 64px",
  backgroundPosition: `${32 - camera.value.x}px ${20 - camera.value.y}px`,
  imageRendering: "auto",
}));

function villagerTaskEntries(villagerId) {
  const entries = villagerTaskEntryMap.value?.[villagerId];
  return Array.isArray(entries) ? entries : [];
}

function taskEntryStyle(taskEntry) {
  const progress = Number(taskEntry?.progress);
  if (!Number.isFinite(progress) || progress <= 0) {
    return {
      backgroundColor: "rgba(18, 28, 20, 0.34)",
    };
  }

  const clamped = Math.max(0, Math.min(100, progress));
  return {
    backgroundImage: `linear-gradient(90deg, rgba(145, 201, 104, 0.46) 0%, rgba(145, 201, 104, 0.46) ${clamped}%, rgba(18, 28, 20, 0.34) ${clamped}%, rgba(18, 28, 20, 0.34) 100%)`,
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

function treeVisualStyle(node) {
  return {
    ...fieldPositionStyle(node.x, node.y - 72),
    width: "10rem",
    height: "10rem",
    zIndex: 1,
  };
}

function treeHitStyle() {
  return {
    width: "2.75rem",
    height: "2.75rem",
    zIndex: 2,
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
  if (isNodeDepleted(node) && node.depletedIcon) {
    return node.depletedIcon;
  }
  return node.icon || props.itemDefinitions[node.itemId]?.icon || "?";
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

function isNodeDepleted(node) {
  return Boolean(node?.hiddenUntil && props.currentTime < node.hiddenUntil);
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
