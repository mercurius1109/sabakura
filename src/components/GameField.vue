<template>
  <section class="relative h-full min-h-[720px] overflow-hidden bg-[#dce8c8]">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5),transparent_20%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.28),transparent_18%),linear-gradient(180deg,#bcd48e_0%,#9dc06f_52%,#83a95b_100%)]"></div>
    <div class="absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(180deg,rgba(112,154,70,0)_0%,rgba(103,145,63,0.18)_30%,rgba(93,123,56,0.78)_100%)]"></div>

    <div class="absolute left-[7%] top-[14%] h-20 w-20 rounded-full bg-white/20 blur-xl"></div>
    <div class="absolute right-[11%] top-[12%] h-24 w-24 rounded-full bg-white/15 blur-2xl"></div>

    <button
      v-for="node in resourceNodes"
      :key="node.id"
      type="button"
      class="absolute -translate-x-1/2 -translate-y-1/2 transition hover:scale-105"
      :class="isTutorialTarget('field-resource', node.id) ? resourceHighlightClass : ''"
      :style="{ left: `${node.x}%`, top: `${node.y}%` }"
      @click="$emit('select-resource', node.id)"
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
      class="absolute -translate-x-1/2 -translate-y-1/2 transition hover:scale-105"
      :class="isTutorialTarget('field-construction', site.structureId) ? cardHighlightClass : ''"
      :style="{ left: `${site.x}%`, top: `${site.y}%` }"
      @click="$emit('select-construction', site.structureId)"
    >
      <div class="rounded-2xl border border-[#73573c] bg-[#b89a73]/90 px-5 py-4 shadow-xl">
        <div class="text-center text-4xl leading-none">{{ site.icon || "?" }}</div>
        <div class="mt-1 text-xs font-bold text-white">{{ site.name }}</div>
        <div class="mt-2 h-2 w-28 overflow-hidden rounded-full bg-black/20">
          <div class="h-full rounded-full bg-[#f8e38f] transition-[width] duration-200" :style="{ width: `${site.progress || 0}%` }"></div>
        </div>
      </div>
    </button>

    <button
      v-if="placedStructures.workbench"
      type="button"
      class="absolute left-[61%] top-[44%] -translate-x-1/2 -translate-y-1/2 transition hover:scale-105"
      :class="isTutorialTarget('field-structure', 'workbench') ? cardHighlightClass : ''"
      @click="$emit('select-workbench')"
    >
      <div class="rounded-2xl border border-[#7f5636] bg-[#a87447] px-5 py-4 shadow-xl">
        <div class="text-center text-4xl leading-none">{{ itemDefinitions.workbench?.icon || "?" }}</div>
        <div class="mt-1 text-xs font-bold text-white">{{ itemDefinitions.workbench?.name }}</div>
      </div>
    </button>

    <button
      v-if="placedStructures.storage"
      type="button"
      class="absolute left-[79%] top-[51%] -translate-x-1/2 -translate-y-1/2 transition hover:scale-105"
      :class="isTutorialTarget('field-structure', 'storage') ? cardHighlightClass : ''"
      @click="$emit('select-storage')"
    >
      <div class="rounded-2xl border border-[#6b4d2f] bg-[#8b6840] px-5 py-4 shadow-xl">
        <div class="text-center text-4xl leading-none">{{ itemDefinitions.storage?.icon || "?" }}</div>
        <div class="mt-1 text-xs font-bold text-white">{{ itemDefinitions.storage?.name }}</div>
      </div>
    </button>

    <button
      v-if="placedStructures.lumberjackHut"
      type="button"
      class="absolute left-[39%] top-[58%] -translate-x-1/2 -translate-y-1/2 transition hover:scale-105"
      :class="isTutorialTarget('field-structure', 'lumberjackHut') ? cardHighlightClass : ''"
      @click="$emit('select-lumberjack-hut')"
    >
      <div class="rounded-2xl border border-[#6a4e31] bg-[#8b6b40] px-5 py-4 shadow-xl">
        <div class="text-center text-4xl leading-none">{{ itemDefinitions.lumberjackHut?.icon || "?" }}</div>
        <div class="mt-1 text-xs font-bold text-white">{{ itemDefinitions.lumberjackHut?.name }}</div>
      </div>
    </button>

    <button
      v-if="player"
      type="button"
      class="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition hover:scale-105"
      :class="isTutorialTarget('field-player', 'player') ? cardHighlightClass : ''"
      :style="{ left: `${player.renderX ?? player.x}%`, top: `${player.renderY ?? player.y}%` }"
      @click="$emit('select-player', player.id)"
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
      class="absolute z-[1] -translate-x-1/2 -translate-y-1/2 transition hover:scale-105"
      :style="{ left: `${villager.renderX ?? villager.x}%`, top: `${villager.renderY ?? villager.y}%` }"
      @click="$emit('select-villager', villager.id)"
    >
      <div class="rounded-2xl border border-white/70 bg-[#f7f0dd]/85 px-3 py-2 shadow-lg backdrop-blur">
        <div class="text-center text-3xl leading-none">{{ villagerIcon }}</div>
        <div class="mt-1 text-xs font-bold text-ink">{{ villager.name }}</div>
      </div>
    </button>
  </section>
</template>

<script setup>
const props = defineProps({
  resourceNodes: { type: Array, required: true },
  player: { type: Object, required: false, default: null },
  villagers: { type: Array, required: true },
  constructionSites: { type: Array, required: true },
  placedStructures: { type: Object, required: true },
  itemDefinitions: { type: Object, required: true },
  tutorialTargets: { type: Array, required: false, default: () => [] },
});

defineEmits([
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
</script>
