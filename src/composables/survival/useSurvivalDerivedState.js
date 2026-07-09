import { computed } from "vue";
import { createItemStore } from "../../game/core/containers.js";

export function createSurvivalDerivedState({
  startedAt,
  now,
  storage,
  placedStructures,
  playerActor,
  villagers,
  craftQueue,
  gatherQueue,
  constructionQueue,
  visibleFieldNodes,
  stations,
  isStationAvailable,
  recipes,
}) {
  const playerRecipes = computed(() => recipes.filter((recipe) => recipe.station === "hand"));

  const isPlayerBusy = computed(() =>
    [...gatherQueue, ...craftQueue, ...constructionQueue].some((task) =>
      task.villagerId === playerActor.id || task.workerType === "self",
    ),
  );

  const availableStations = computed(() => stations.filter((station) => isStationAvailable(station.id)));

  const elapsedTime = computed(() => {
    const elapsed = Math.floor((now.value - startedAt) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  });

  const fieldVillagers = computed(() => [playerActor, ...villagers]);

  const fieldItemInventory = computed(() => {
    const counts = createItemStore();

    visibleFieldNodes().forEach((node) => {
      if (node.type !== "pickup" || !node.itemId) {
        return;
      }
      counts[node.itemId] = (counts[node.itemId] || 0) + 1;
    });

    return counts;
  });

  const activeInventory = computed(() => (placedStructures.storage ? storage : fieldItemInventory.value));

  return {
    activeInventory,
    availableStations,
    elapsedTime,
    fieldItemInventory,
    fieldVillagers,
    isPlayerBusy,
    playerRecipes,
  };
}
