
const props = defineProps({
  resourceNodes: { type: Array, required: true },
  player: { type: Object, required: false, default: null },
  villagers: { type: Array, required: true },
  constructionSites: { type: Array, required: true },
  placedStructures: { type: Object, required: true },
  itemDefinitions: { type: Object, required: true },
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

function nodeIcon(node) {
  if (node.type === "tree") {
    return "🌳";
  }

  return props.itemDefinitions[node.itemId]?.icon || "📦";
}

function nodeTitle(node) {
  return node.title || props.itemDefinitions[node.itemId]?.name || "";
}
