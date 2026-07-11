import { computed } from "vue";

export function useAppShellState(options) {
  const {
    isTutorialDismissed,
    isLogWindowVisible,
    isTutorialComplete,
    currentTutorialStep,
    constructionSites,
    constructionQueue,
    taskProgress,
    placedStructures,
    buildingById,
    itemDefinitions,
  } = options;

  const gameSpeedOptions = [0.1, 1, 10];
  const tutorialHighlightClass = "tutorial-highlight tutorial-highlight-ui";
  const currentTutorialTargets = computed(() => currentTutorialStep.value?.highlightTargets || []);

  function dismissTutorial() {
    if (!isTutorialComplete.value) {
      return;
    }
    isTutorialDismissed.value = true;
  }

  function toggleLogWindow() {
    isLogWindowVisible.value = !isLogWindowVisible.value;
  }

  const constructionSitesForField = computed(() =>
    constructionSites.map((site) => {
      const task = constructionQueue.find((entry) => entry.structureId === site.structureId);
      return {
        ...site,
        progress: task ? taskProgress(task) : 0,
      };
    }),
  );

  const placedStructureNodes = computed(() =>
    Object.entries(placedStructures)
      .filter(([, isPlaced]) => Boolean(isPlaced))
      .map(([structureId]) => {
        const building = buildingById(structureId);
        return building
          ? {
            id: structureId,
            x: building.x,
            y: building.y,
            icon: itemDefinitions[structureId]?.icon || building.icon || "?",
            name: itemDefinitions[structureId]?.name || building.name,
          }
          : null;
      })
      .filter(Boolean),
  );

  return {
    gameSpeedOptions,
    tutorialHighlightClass,
    currentTutorialTargets,
    dismissTutorial,
    toggleLogWindow,
    constructionSitesForField,
    placedStructureNodes,
  };
}
