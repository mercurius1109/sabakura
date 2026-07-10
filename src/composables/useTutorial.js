import { computed, ref, watchEffect } from "vue";
import { createTutorialSteps } from "../game/tutorial/tutorialSteps.js";
import { t } from "../i18n/index.js";

export function useTutorial({
  playerActor,
  villagers,
  placedStructures,
  constructionSites,
  visibleFieldNodes,
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

  function findVisibleNodeIdForItem(itemId) {
    const nodes = visibleFieldNodes()
      .filter((node) => node.type === "pickup" && node.itemId === itemId);
    if (nodes.length === 0) {
      return null;
    }

    const nearest = nodes.reduce((best, node) => {
      if (!best) {
        return node;
      }

      const bestDistance = distanceBetween(best, playerActor);
      const nodeDistance = distanceBetween(node, playerActor);
      return nodeDistance < bestDistance ? node : best;
    }, null);

    return nearest?.id || null;
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
    findVisibleNodeIdForItem,
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
      const hasRemainingItemRequirements = requirements.some((requirement) => requirement.itemId && requirement.remaining > 0);
      const requirementHighlightTargets = buildRequirementHighlightTargets(requirements, findVisibleNodeIdForItem);
      const stepHighlightTargets = hasRemainingItemRequirements
        ? []
        : (step.getHighlightTargets?.() || step.highlightTargets || []);

      return {
        ...step,
        title: t(step.titleKey, resolveTextParams(step.textParams || {}, itemDefinitions)),
        description: t(step.descriptionKey, resolveTextParams(step.textParams || {}, itemDefinitions)),
        completed,
        requirements,
        highlightTargets: mergeHighlightTargets(stepHighlightTargets, requirementHighlightTargets),
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

function distanceBetween(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function buildRequirementHighlightTargets(requirements, findVisibleNodeIdForItem) {
  return requirements.flatMap((requirement) => {
    if (!requirement.itemId || requirement.remaining <= 0) {
      return [];
    }

    const nodeId = findVisibleNodeIdForItem(requirement.itemId);
    return nodeId ? [{ kind: "field-resource", id: nodeId }] : [];
  });
}

function mergeHighlightTargets(primaryTargets, secondaryTargets) {
  const merged = [...primaryTargets, ...secondaryTargets];
  const seen = new Set();

  return merged.filter((target) => {
    const key = `${target.kind}:${target.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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
