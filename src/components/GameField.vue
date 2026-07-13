<template>
  <section class="relative h-full min-h-[720px] overflow-hidden bg-[#dce8c8]" @click="emitFieldClick">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5),transparent_20%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.28),transparent_18%),linear-gradient(180deg,#bcd48e_0%,#9dc06f_52%,#83a95b_100%)]"></div>
    <div class="absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(180deg,rgba(112,154,70,0)_0%,rgba(103,145,63,0.18)_30%,rgba(93,123,56,0.78)_100%)]"></div>

    <div class="absolute left-[7%] top-[14%] h-20 w-20 rounded-full bg-white/20 blur-xl"></div>
    <div class="absolute right-[11%] top-[12%] h-24 w-24 rounded-full bg-white/15 blur-2xl"></div>

    <div class="absolute inset-0">
      <button
        v-for="node in resourceNodes"
        :key="node.id"
        type="button"
        class="transition hover:scale-105"
        :class="isTutorialTarget('field-resource', node.id) ? resourceHighlightClass : ''"
        :style="fieldPositionStyle(node.x, node.y)"
        @click.stop="$emit('select-resource', node.id)"
      >
        <div class="rounded-full border border-white/70 bg-white/65 px-3 py-2 shadow-lg backdrop-blur">
          <div class="text-center text-3xl leading-none">{{ nodeIcon(node) }}</div>
          <div class="mt-1 text-xs font-bold text-ink">{{ nodeTitle(node) }}</div>
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
        class="z-10 transition hover:scale-105"
        :class="isTutorialTarget('field-player', 'player') ? cardHighlightClass : ''"
        :style="actorPositionStyle(player, 10)"
        @click.stop="$emit('select-player', player.id)"
      >
        <div class="rounded-2xl border-2 border-[#2d6a4f] bg-[#f4fbf2]/95 px-3 py-2 shadow-lg ring-2 ring-white/70 backdrop-blur">
          <div class="text-center text-3xl leading-none">{{ playerIcon }}</div>
          <div class="mt-1 text-xs font-bold text-ink">{{ player.name }}</div>
        </div>
      </button>

      <button
        v-for="villager in villagers"
        :key="villager.id"
        type="button"
        class="transition hover:scale-105"
        :style="actorPositionStyle(villager, 1)"
        @click.stop="$emit('select-villager', villager.id)"
      >
        <div class="rounded-2xl border border-white/70 bg-[#f7f0dd]/85 px-3 py-2 shadow-lg backdrop-blur">
          <div class="text-center text-3xl leading-none">{{ villagerIcon }}</div>
          <div class="mt-1 text-xs font-bold text-ink">{{ villager.name }}</div>
        </div>
      </button>

      <button
        v-if="pendingPlacement"
        type="button"
        class="absolute inset-0 z-20 cursor-crosshair bg-white/5"
        @click="emitFieldClick"
      >
        <div class="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-ink shadow-lg backdrop-blur">
          {{ pendingPlacement.name }}
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  resourceNodes: { type: Array, required: true },
  player: { type: Object, required: false, default: null },
  villagers: { type: Array, required: true },
  constructionSites: { type: Array, required: true },
  placedStructureNodes: { type: Array, required: true },
  itemDefinitions: { type: Object, required: true },
  pendingPlacement: { type: Object, required: false, default: null },
  tutorialTargets: { type: Array, required: false, default: () => [] },
});

const emit = defineEmits([
  "field-click",
  "select-resource",
  "select-workbench",
  "select-lumberjack-hut",
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

function fieldPositionStyle(x, y, zIndex = null) {
  return {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
    ...(zIndex === null ? {} : { zIndex }),
  };
}

function actorPositionStyle(actor, zIndex = null) {
  return fieldPositionStyle(actor?.renderX ?? actor?.x ?? 0, actor?.renderY ?? actor?.y ?? 0, zIndex);
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

function isTutorialTarget(kind, id) {
  return props.tutorialTargets.some((target) => target.kind === kind && target.id === id);
}

function emitFieldClick(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
  const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
  emit("field-click", { x, y });
}

function clampPercent(value) {
  return Math.max(6, Math.min(94, Number(value.toFixed(2))));
}

function selectStructure(structureId) {
  if (structureId === "workbench") {
    return emit("select-workbench");
  }
  if (structureId === "storage") {
    return emit("select-storage");
  }
  if (structureId === "lumberjackHut") {
    return emit("select-lumberjack-hut");
  }
  return null;
}
</script>
