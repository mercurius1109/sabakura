import { computed, ref, watchEffect } from "vue";
import { createTutorialSteps } from "../game/tutorial/tutorialSteps.js";
import { t } from "../i18n/index.js";

export function useTutorial({
  playerActor,
  villagers,
  placedStructures,
  constructionSites,
  recipeById,
  buildingById,
  stationById,
  assignedVillagerList,
  stationCraftEntries,
  stockRules,
  itemDefinitions,
}) {
  const currentStepIndex = ref(0);

  function getPlayerItemCount(itemId) {
    return playerActor.inventory[itemId] || 0;
  }

  function hasPlacedOrStarted(structureId) {
    return Boolean(placedStructures[structureId])
      || constructionSites.some((site) => site.structureId === structureId);
  }

  function getVillagerCount() {
    return villagers.length;
  }

  function isStructureCompleted(structureId) {
    return Boolean(placedStructures[structureId]);
  }

  function getAssignedVillagerCount(stationId) {
    return assignedVillagerList(stationId).length;
  }

  function hasStationCraftEntry(stationId, recipeId) {
    return stationCraftEntries(stationId).some((entry) => entry.recipeId === recipeId);
  }

  function isStockRuleEnabled(itemId) {
    return stockRules.some((rule) => rule.itemId === itemId && rule.enabled);
  }

  const steps = createTutorialSteps({
    recipeById,
    buildingById,
    stationById,
    getPlayerItemCount,
    getVillagerCount,
    hasPlacedOrStarted,
    isStructureCompleted,
    getAssignedVillagerCount,
    hasStationCraftEntry,
    isStockRuleEnabled,
  });

  const stepStates = computed(() =>
    steps.map((step) => {
      const completed = step.isCompleted({
        playerActor,
        villagers,
        placedStructures,
        constructionSites,
      });
      const requirements = (step.getRequirements?.() || []).map((requirement) => ({
        ...requirement,
        label: requirement.labelKey
          ? t(requirement.labelKey, requirement.labelParams || {})
          : itemDefinitions[requirement.itemId]?.name || requirement.itemId,
        remaining: Math.max(0, requirement.needed - requirement.current),
      }));

      return {
        ...step,
        title: t(step.titleKey, resolveTextParams(step.textParams || {}, itemDefinitions)),
        description: t(step.descriptionKey, resolveTextParams(step.textParams || {}, itemDefinitions)),
        completed,
        requirements,
        highlightTargets: step.highlightTargets || [],
      };
    }),
  );

  watchEffect(() => {
    let nextIndex = currentStepIndex.value;
    while (nextIndex < stepStates.value.length && stepStates.value[nextIndex].completed) {
      nextIndex += 1;
    }
    if (nextIndex !== currentStepIndex.value) {
      currentStepIndex.value = nextIndex;
    }
  });

  const currentStep = computed(() => stepStates.value[currentStepIndex.value] || null);
  const completedCount = computed(() => Math.min(currentStepIndex.value, stepStates.value.length));
  const totalSteps = computed(() => stepStates.value.length);
  const isTutorialComplete = computed(() => currentStepIndex.value >= totalSteps.value);

  return {
    currentStep,
    completedCount,
    totalSteps,
    isTutorialComplete,
    currentStepIndex,
  };
}

function resolveTextParams(params, itemDefinitions) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (key.endsWith("Key")) {
        return [key.slice(0, -3), t(value)];
      }
      if (key === "itemId") {
        return [key, itemDefinitions[value]?.name || value];
      }
      return [key, value];
    }),
  );
}
