import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useInventoryView } from "./useInventoryView.js";
import { itemDefinitions as rawItemDefinitions } from "../game/data/items.js";
import { recipes as rawRecipes } from "../game/data/recipes.js";
import { stations as rawStations } from "../game/data/stations.js";
import {
  buildingDefinitions as rawBuildingDefinitions,
  defaultTargets,
  droppedLogOffsets,
  fieldResourceConfigs as rawFieldResourceConfigs,
  fieldTreeNodes as rawFieldTreeNodes,
  gatherActions as rawGatherActions,
  genericDropOffsets,
  playerDropPoint,
  storagePoint,
  villagerNamePool,
} from "../game/data/survivalConfig.js";
import { createActor, defaultActorMoveSpeedPerSecond } from "../game/core/actors.js";
import { addItem, createContainer, createItemStore, removeItem, transferItem } from "../game/core/containers.js";
import {
  createInitialFieldNodes as createCoreInitialFieldNodes,
  randomFieldPosition as createRandomFieldPosition,
} from "../game/core/field.js";
import {
  actorCanTakeRequiredItem as canActorTakeRequiredItem,
  actorHasItem,
  assignedStationsSummary,
  inventorySummary,
  isPlayerActor as isPlayerActorCore,
  taskLabel as buildTaskLabel,
  taskPhaseLabel,
} from "../game/core/survivalActorUtils.js";
import { createConstructionSystem } from "./survival/useConstructionSystem.js";
import { createSurvivalFieldHelpers } from "./survival/useSurvivalField.js";
import { createSurvivalManagementHelpers } from "./survival/useSurvivalManagement.js";
import { createSurvivalTaskStarters } from "./survival/useSurvivalTaskStarters.js";
import { createSurvivalTaskRuntime } from "./survival/useSurvivalTaskRuntime.js";
import { createSurvivalAutomation } from "./survival/useSurvivalAutomation.js";
import { createSurvivalDerivedState } from "./survival/useSurvivalDerivedState.js";
import { createSurvivalFlow } from "./survival/useSurvivalFlow.js";
import { t } from "../i18n/index.js";

const villagerMoveSpeedPerSecond = defaultActorMoveSpeedPerSecond;
const tickIntervalMs = 250;
const defaultGameSpeed = 1;

export function useSurvivalCraft() {
  const itemDefinitions = Object.fromEntries(
    Object.entries(rawItemDefinitions).map(([id, meta]) => [
      id,
      { ...meta, name: t(meta.nameKey) },
    ]),
  );
  const recipes = rawRecipes.map((recipe) => ({ ...recipe, name: t(recipe.nameKey) }));
  const stations = rawStations.map((station) => ({
    ...station,
    name: t(station.nameKey),
    description: t(station.descriptionKey),
  }));
  const gatherActions = rawGatherActions.map((action) => ({ ...action, label: t(action.labelKey) }));
  const buildingDefinitions = rawBuildingDefinitions.map((building) => ({ ...building, name: t(building.nameKey) }));
  const fieldResourceConfigs = rawFieldResourceConfigs.map((config) => ({
    ...config,
    title: t(config.titleKey),
    actionLabel: t(config.actionLabelKey),
  }));
  const fieldTreeNodes = rawFieldTreeNodes.map((node) => ({
    ...node,
    title: t(node.titleKey),
    actionLabel: t(node.actionLabelKey),
  }));

  function createInitialFieldNodes() {
    return createCoreInitialFieldNodes(fieldResourceConfigs, fieldTreeNodes);
  }

  const startedAt = Date.now();
  const now = ref(Date.now());
  const lastTickAt = ref(Date.now());
  const gameSpeed = ref(defaultGameSpeed);
  const storageContainer = reactive(createContainer({
    id: "storage",
    kind: "storage",
    name: t("ui.storage"),
    inventory: reactive(createItemStore()),
  }));
  const storage = storageContainer.inventory;
  const playerActor = reactive(createActor({
    id: "player",
    kind: "player",
    name: t("ui.playerName"),
    x: 50,
    y: 78,
  }));
  const placedStructures = reactive({
    workbench: false,
    lumberjackHut: false,
    storage: false,
  });
  const structurePositions = reactive({});
  const constructionSites = reactive([]);
  const fieldNodes = reactive(createInitialFieldNodes());
  const villagers = reactive([
    createActor({
      id: "villager-haru",
      name: villagerNamePool[0],
      x: 24,
      y: 18,
    }),
  ]);
  const craftQueue = reactive([]);
  const gatherQueue = reactive([]);
  const constructionQueue = reactive([]);
  const log = reactive([]);
  const stockRules = reactive(
    gatherActions.map((action) => ({
      id: `stock-${action.itemId}`,
      kind: "gather",
      actionId: action.id,
      itemId: action.itemId,
      enabled: false,
      target: defaultTargets[action.itemId],
    })),
  );
  const stationAssignments = reactive(
    Object.fromEntries(
      stations.map((station) => [
        station.id,
        {
          villagerIds: [],
          craftEntries: [],
        },
      ]),
    ),
  );

  function makeId(prefix) {
    const canUseRandomUUID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
    return canUseRandomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random()}`;
  }

  function addLog(message) {
    const time = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    log.unshift({ id: makeId("log"), text: `${time} ${message}` });
    if (log.length > 18) {
      log.splice(18);
    }
  }

  function recipeById(recipeId) {
    return recipes.find((recipe) => recipe.id === recipeId);
  }

  function gatherActionById(actionId) {
    return gatherActions.find((action) => action.id === actionId);
  }

  function randomFieldPosition() {
    return createRandomFieldPosition();
  }

  function stationById(stationId) {
    return stations.find((station) => station.id === stationId);
  }

  function buildingById(buildingId) {
    const building = buildingDefinitions.find((entry) => entry.id === buildingId);
    if (!building) {
      return null;
    }

    const positionedSite = structurePositions[buildingId]
      || constructionSites.find((site) => site.structureId === buildingId);
    return positionedSite
      ? { ...building, x: positionedSite.x, y: positionedSite.y }
      : building;
  }

  function itemName(itemId) {
    return itemDefinitions[itemId]?.name || itemId;
  }

  function requestCheckStockRules() {
    return checkStockRules();
  }

  function requestCheckConstructionSites() {
    return checkConstructionSites();
  }

  function syncActorRenderPosition(actor) {
    if (!actor) {
      return;
    }
    actor.prevX = actor.x;
    actor.prevY = actor.y;
    actor.renderX = actor.x;
    actor.renderY = actor.y;
  }

  function snapshotActorPosition(actor) {
    if (!actor) {
      return;
    }
    actor.prevX = actor.x;
    actor.prevY = actor.y;
  }

  function updateActorRenderPosition(actor, alpha) {
    if (!actor) {
      return;
    }
    actor.renderX = actor.prevX + (actor.x - actor.prevX) * alpha;
    actor.renderY = actor.prevY + (actor.y - actor.prevY) * alpha;
  }

  const {
    actorWorkPoint,
    buildingWorkPoint,
    distanceBetween,
    fieldNodeById,
    fieldNodeIndexById,
    findGatherTargetNode,
    gatherActionForNode,
    isFieldNodeVisible,
    moveVillagerTowards,
    nodeWorkPoint,
    spawnDroppedItems,
    spawnDroppedLogs,
    storageWorkPoint,
    visibleFieldNodes,
  } = createSurvivalFieldHelpers({
    fieldNodes,
    now,
    villagerMoveSpeedPerSecond,
    droppedLogOffsets,
    genericDropOffsets,
    playerDropPoint,
    storagePoint,
    makeId,
    itemName,
    gatherActionById,
    buildingById,
  });

  const {
    activeInventory,
    availableStations,
    elapsedTime,
    fieldItemInventory,
    fieldVillagers,
    isPlayerBusy,
    playerRecipes,
  } = createSurvivalDerivedState({
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
    isStationAvailable: (stationId) => Boolean(placedStructures[stationId]),
    recipes,
  });

  const { itemCards, ownedKinds, expectedStock, formatList } = useInventoryView({
    inventory: activeInventory,
    craftQueue,
    gatherQueue,
    recipes,
    gatherActions,
    itemDefinitions,
  });

  const {
    availableItemCount,
    buildingStatus,
    canPlaceStructure,
    consumeActorResources,
    consumeAvailableResources,
    consumeFieldItems,
    findPickupNodeByItem,
    hasActorResources,
    hasConstructionSite,
    hasResources,
    isStructurePlaced,
    placeStructure,
    visiblePickupNodesByItem,
  } = createConstructionSystem({
    playerActor,
    placedStructures,
    structurePositions,
    storage,
    constructionSites,
    fieldNodes,
    makeId,
    addLog,
    buildingById,
    fieldNodeIndexById,
    visibleFieldNodes,
    checkConstructionSites: requestCheckConstructionSites,
    t,
  });

  function cancelConstructionSite(structureId) {
    const siteIndex = constructionSites.findIndex((site) => site.structureId === structureId);
    if (siteIndex < 0) {
      return false;
    }

    const site = constructionSites[siteIndex];
    const building = buildingById(structureId);

    for (let index = constructionQueue.length - 1; index >= 0; index -= 1) {
      const task = constructionQueue[index];
      if (task.structureId !== structureId) {
        continue;
      }
      const actor = task.villagerId ? actorById(task.villagerId) : null;
      if (actor) {
        actor.taskId = null;
      }
      constructionQueue.splice(index, 1);
    }

    constructionSites.splice(siteIndex, 1);
    delete structurePositions[structureId];
    spawnDroppedItems(site.costs || building?.costs || {}, { x: site.x, y: site.y });
    addLog(t("log.buildingCancelled", { building: building?.name || structureId }));
    return true;
  }

  const {
    activeAutoTaskForRule,
    actorById,
    actorCanTakeRequiredItem,
    addStationCraftEntry,
    addVillager,
    addVillagerToStation,
    assignedVillagerCount,
    assignedVillagerIds,
    assignedVillagerList,
    availableVillagerForConstruction,
    availableVillagerForGather,
    availableVillagerForRecipe,
    canStartStationCraftEntry,
    craftEntryStatus,
    findTaskById,
    isGatherUnlocked,
    isPlayerActor,
    isRecipeUnlocked,
    isStationAvailable,
    normalizeCraftEntry,
    normalizeRule,
    onRuleChanged,
    removeStationCraftEntry,
    removeVillagerFromStation,
    stationAssignment,
    stationCraftEntries,
    stationName,
    stationRecipes,
    stationTargetItemId,
    stationTasks,
    stockRuleSourceLabel,
    stockRuleStatus,
    taskLabel,
    unassignedVillagersForStation,
    updateStationCraftEntryTarget,
    villagerCanTakeFromStorage,
    villagerHasItem,
    villagerInventorySummary,
    villagerName,
    villagerNote,
  } = createSurvivalManagementHelpers({
    stations,
    recipes,
    placedStructures,
    storage,
    villagers,
    playerActor,
    stockRules,
    stationAssignments,
    craftQueue,
    gatherQueue,
    constructionQueue,
    villagerNamePool,
    makeId,
    addLog,
    createActor,
    stationById,
    buildingById,
    gatherActionById,
    itemName,
    actorHasItem,
    isPlayerActorCore,
    canActorTakeRequiredItem,
    hasActorResources,
    hasResources,
    availableItemCount,
    expectedStock,
    buildTaskLabel,
    taskPhaseLabel,
    inventorySummary,
    assignedStationsSummary,
    checkStockRules: requestCheckStockRules,
    checkConstructionSites: requestCheckConstructionSites,
    t,
  });

  const {
    canStartGather,
    prepareActorRequiredItem,
    prepareVillagerRequiredItem,
    startActorFieldTask,
    startActorGatherTask,
    startActorPickupTask,
    startConstruction,
    startCraft,
    startGather,
    startPlayerConstruction,
    startPlayerCraft: startPlayerCraftTask,
    startPlayerFieldTask,
    startStationCraftEntry,
  } = createSurvivalTaskStarters({
    now,
    playerActor,
    placedStructures,
    constructionSites,
    craftQueue,
    gatherQueue,
    constructionQueue,
    makeId,
    addLog,
    itemName,
    actorHasItem,
    isPlayerActor,
    availableItemCount,
    findPickupNodeByItem,
    villagerHasItem,
    availableVillagerForGather,
    availableVillagerForRecipe,
    availableVillagerForConstruction,
    gatherActionById,
    findGatherTargetNode,
    isGatherUnlocked,
    recipeById,
    isRecipeUnlocked,
    hasActorResources,
    consumeActorResources,
    buildingById,
    stationName,
    stationCraftEntries,
    actorById,
    findTaskById,
    fieldNodeById,
    actorWorkPoint,
    gatherActionForNode,
    nodeWorkPoint,
    buildingWorkPoint,
    storageWorkPoint,
    distanceBetween,
    t,
  });

  function startPlayerCraft(recipeId) {
    return startPlayerCraftTask(recipeId, isPlayerBusy);
  }

  function canStartPlayerRecipeWithState(recipe) {
    return canStartPlayerRecipeAction(recipe, isPlayerBusy);
  }

  const {
    canStartPlayerRecipe: canStartPlayerRecipeAction,
    pickupFieldNode,
    restartVillagerTask,
    shouldVillagerContinue,
    startPlannedTask,
  } = createSurvivalFlow({
    playerActor,
    stockRules,
    recipeById,
    expectedStock,
    fieldNodeById,
    isFieldNodeVisible,
    gatherActionForNode,
    startPlayerFieldTask,
    startActorFieldTask,
    startGather,
    startConstruction,
    startCraft,
    actorById,
    stationCraftEntries,
    isRecipeUnlocked,
    hasActorResources,
  });

  const {
    checkConstructionSites,
    checkStockRules,
    respawnFieldNodes,
  } = createSurvivalAutomation({
    now,
    fieldNodes,
    stations,
    constructionSites,
    stockRules,
    expectedStock,
    normalizeRule,
    normalizeCraftEntry,
    activeAutoTaskForRule,
    gatherActionById,
    isGatherUnlocked,
    availableVillagerForGather,
    findGatherTargetNode,
    startGather,
    stationCraftEntries,
    recipeById,
    isStationAvailable,
    isRecipeUnlocked,
    availableVillagerForRecipe,
    hasResources,
    startCraft,
    randomFieldPosition,
    startConstruction,
  });

  const {
    remainingSeconds,
    taskProgress,
    tick,
  } = createSurvivalTaskRuntime({
    now,
    playerActor,
    placedStructures,
    storageContainer,
    storagePoint,
    craftQueue,
    gatherQueue,
    constructionQueue,
    constructionSites,
    fieldNodes,
    addLog,
    itemName,
    recipeById,
    villagerName,
    actorById,
    fieldNodeById,
    isFieldNodeVisible,
    fieldNodeIndexById,
    actorWorkPoint,
    spawnDroppedLogs,
    spawnDroppedItems,
    storageWorkPoint,
    distanceBetween,
    addItemToStore: addItem,
    removeItemFromStore: removeItem,
    restartVillagerTask,
    respawnFieldNodes,
    checkStockRules,
    checkConstructionSites,
    moveVillagerTowards,
    buildingById,
    t,
  });

  const isPlayerAdjacentToStorage = computed(() => {
    if (!placedStructures.storage) {
      return false;
    }
    const storageBuilding = buildingById("storage");
    const storageAnchor = storageBuilding
      ? { x: storageBuilding.x, y: storageBuilding.y }
      : storagePoint;
    return distanceBetween(playerActor, storageAnchor) <= 6.5;
  });

  function isPlayerAdjacentToActor(actor) {
    if (!actor || actor.id === playerActor.id) {
      return false;
    }
    return distanceBetween(playerActor, actor) <= 5.5;
  }

  function setGameSpeed(nextSpeed) {
    if (![0.1, 1, 10].includes(nextSpeed)) {
      return;
    }
    gameSpeed.value = nextSpeed;
    addLog(`Game speed set to x${nextSpeed}.`);
  }

  function playerTransferTargetPoint(targetKind, actorId = null) {
    if (targetKind === "storage") {
      return storageWorkPoint(playerActor);
    }

    const actor = actorById(actorId);
    return actor ? actorWorkPoint(actor, playerActor) : null;
  }

  function approachTransferTarget(targetKind = "storage", actorId = null) {
    if (!playerActor) {
      return false;
    }
    if (playerActor.taskId && !findTaskById(playerActor.taskId)) {
      playerActor.taskId = null;
    }
    if (playerActor.taskId !== null) {
      return false;
    }

    if (targetKind === "storage" && isPlayerAdjacentToStorage.value) {
      return true;
    }

    const targetActor = targetKind === "actor" ? actorById(actorId) : null;
    if (targetKind === "actor" && isPlayerAdjacentToActor(targetActor)) {
      return true;
    }

    const targetPoint = playerTransferTargetPoint(targetKind, actorId);
    if (!targetPoint) {
      return false;
    }

    const label = targetKind === "storage"
      ? `Move to ${storageContainer.name}`
      : `Move to ${targetActor?.name || "actor"}`;

    const task = {
      id: makeId("approach"),
      kind: "approach",
      label,
      workerType: "player",
      villagerId: playerActor.id,
      station: targetKind,
      source: "manual",
      phase: "movingToTarget",
      targetPoint,
      initialTargetDistance: distanceBetween(playerActor, targetPoint),
      workStartedAt: null,
      duration: 1,
      actorId,
      targetKind,
    };

    playerActor.taskId = task.id;
    gatherQueue.push(task);
    return true;
  }

  function queuePlayerTransfer(itemId, direction, actorId = null, targetKind = "storage") {
    if (!playerActor) {
      return false;
    }
    if (playerActor.taskId && !findTaskById(playerActor.taskId)) {
      playerActor.taskId = null;
    }
    if (playerActor.taskId !== null) {
      addLog(`${playerActor.name} is busy right now.`);
      return false;
    }

    const targetActor = targetKind === "actor" ? actorById(actorId) : null;
    const playerOwnsItem = actorHasItem(playerActor, itemId);
    const storageOwnsItem = (storage[itemId] || 0) > 0;
    const actorOwnsItem = targetActor ? actorHasItem(targetActor, itemId) : false;

    if ((direction === "toStorage" || direction === "toActor") && !playerOwnsItem) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    if (direction === "fromStorage" && !storageOwnsItem) {
      addLog(`${itemName(itemId)} is not in storage.`);
      return false;
    }
    if (direction === "fromActor" && !actorOwnsItem) {
      addLog(`${targetActor?.name || "Actor"} does not have ${itemName(itemId)}.`);
      return false;
    }

    const targetPoint = playerTransferTargetPoint(targetKind, actorId);
    if (!targetPoint) {
      return false;
    }

    const task = {
      id: makeId("transfer"),
      kind: "transfer",
      label: direction === "toStorage"
        ? `Store ${itemName(itemId)}`
        : direction === "fromStorage"
          ? `Take ${itemName(itemId)}`
          : direction === "toActor"
            ? `Give ${itemName(itemId)}`
            : `Take ${itemName(itemId)}`,
      itemId,
      amount: 1,
      workerType: "player",
      villagerId: playerActor.id,
      station: targetKind,
      source: "manual",
      phase: "movingToTarget",
      targetPoint,
      initialTargetDistance: distanceBetween(playerActor, targetPoint),
      workStartedAt: null,
      duration: 300,
      transferDirection: direction,
      actorId,
      targetKind,
    };

    playerActor.taskId = task.id;
    gatherQueue.push(task);
    if (direction === "toStorage") {
      addLog(`${playerActor.name} is moving ${itemName(itemId)} to storage.`);
    } else if (direction === "fromStorage") {
      addLog(`${playerActor.name} is going to take ${itemName(itemId)} from storage.`);
    } else if (direction === "toActor") {
      addLog(`${playerActor.name} is bringing ${itemName(itemId)} to ${targetActor?.name || "actor"}.`);
    } else {
      addLog(`${playerActor.name} is going to take ${itemName(itemId)} from ${targetActor?.name || "actor"}.`);
    }
    return true;
  }

  function moveItemFromActorToStorage(actor, itemId, amount = 1) {
    if (!placedStructures.storage || !actor || actor.id !== playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToStorage.value) {
      addLog(`${playerActor.name} must stand next to storage to move items.`);
      return false;
    }
    if (!transferItem(playerActor, storageContainer, itemId, amount)) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    addLog(`${playerActor.name} moved ${itemName(itemId)} to ${storageContainer.name}.`);
    return true;
  }

  function moveItemFromStorageToActor(actor, itemId, amount = 1) {
    if (!placedStructures.storage || !actor || actor.id !== playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToStorage.value) {
      addLog(`${playerActor.name} must stand next to storage to move items.`);
      return false;
    }
    if (!transferItem(storageContainer, playerActor, itemId, amount)) {
      addLog(`${itemName(itemId)} is not in storage.`);
      return false;
    }
    addLog(`${playerActor.name} took ${itemName(itemId)} from ${storageContainer.name}.`);
    return true;
  }

  function moveItemFromActorToActor(sourceActor, targetActor, itemId, amount = 1) {
    if (!sourceActor || !targetActor || sourceActor.id !== playerActor.id || targetActor.id === playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToActor(targetActor)) {
      addLog(`${playerActor.name} must stand next to ${targetActor.name} to move items.`);
      return false;
    }
    if (!transferItem(playerActor, targetActor, itemId, amount)) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    addLog(`${playerActor.name} gave ${itemName(itemId)} to ${targetActor.name}.`);
    return true;
  }

  function moveItemFromOtherActorToPlayer(sourceActor, targetActor, itemId, amount = 1) {
    if (!sourceActor || !targetActor || sourceActor.id === playerActor.id || targetActor.id !== playerActor.id || amount !== 1) {
      return false;
    }
    if (!isPlayerAdjacentToActor(sourceActor)) {
      addLog(`${playerActor.name} must stand next to ${sourceActor.name} to move items.`);
      return false;
    }
    if (!transferItem(sourceActor, playerActor, itemId, amount)) {
      addLog(`${sourceActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    addLog(`${playerActor.name} took ${itemName(itemId)} from ${sourceActor.name}.`);
    return true;
  }

  function dropPlayerItem(itemId, amount = 1) {
    if (!playerActor || amount !== 1) {
      return false;
    }
    if (playerActor.taskId && !findTaskById(playerActor.taskId)) {
      playerActor.taskId = null;
    }
    if (playerActor.taskId !== null) {
      addLog(`${playerActor.name} is busy right now.`);
      return false;
    }
    if (!actorHasItem(playerActor, itemId)) {
      addLog(`${playerActor.name} does not have ${itemName(itemId)}.`);
      return false;
    }
    if (!removeItem(playerActor.inventory, itemId, amount)) {
      return false;
    }

    spawnDroppedItems({ [itemId]: amount }, { x: playerActor.x, y: playerActor.y });
    addLog(`${playerActor.name} dropped ${itemName(itemId)}.`);
    return true;
  }

  function clearLog() {
    log.splice(0);
  }

  function queueForTask(task) {
    if (!task) {
      return null;
    }
    if (craftQueue.includes(task)) {
      return craftQueue;
    }
    if (gatherQueue.includes(task)) {
      return gatherQueue;
    }
    if (constructionQueue.includes(task)) {
      return constructionQueue;
    }
    return null;
  }

  function refundTaskCosts(task, actor) {
    if (!task || !actor || task.kind !== "craft" || task.carriedOutputs) {
      return;
    }

    const recipe = recipeById(task.recipeId);
    if (!recipe?.costs) {
      return;
    }

    Object.entries(recipe.costs).forEach(([itemId, amount]) => {
      addItem(actor.inventory, itemId, amount);
    });
  }

  function cancelTask(taskId) {
    const task = findTaskById(taskId);
    if (!task) {
      return false;
    }

    const actor = task.villagerId ? actorById(task.villagerId) : null;
    if (actor) {
      actor.taskId = null;
    }

    refundTaskCosts(task, actor);

    const queue = queueForTask(task);
    if (!queue) {
      return false;
    }

    const index = queue.findIndex((entry) => entry.id === task.id);
    if (index >= 0) {
      queue.splice(index, 1);
    }

    addLog(t("log.taskCancelled", { task: taskLabel(task) }));
    return true;
  }

  let animationFrameId = null;
  let lastFrameAt = 0;
  let accumulatedTickMs = 0;

  function renderFrame(timestamp) {
    if (!lastFrameAt) {
      lastFrameAt = timestamp;
    }

    const frameDeltaMs = Math.min(timestamp - lastFrameAt, tickIntervalMs);
    lastFrameAt = timestamp;
    accumulatedTickMs += frameDeltaMs * gameSpeed.value;

    while (accumulatedTickMs >= tickIntervalMs) {
      snapshotActorPosition(playerActor);
      villagers.forEach(snapshotActorPosition);
      tick(tickIntervalMs);
      accumulatedTickMs -= tickIntervalMs;
      lastTickAt.value = Date.now();
    }

    const alpha = Math.max(0, Math.min(1, accumulatedTickMs / tickIntervalMs));

    updateActorRenderPosition(playerActor, alpha);
    villagers.forEach((villager) => updateActorRenderPosition(villager, alpha));

    animationFrameId = requestAnimationFrame(renderFrame);
  }

  onMounted(() => {
    syncActorRenderPosition(playerActor);
    villagers.forEach(syncActorRenderPosition);
    addLog(t("log.gameStarted"));
    lastFrameAt = 0;
    accumulatedTickMs = 0;
    animationFrameId = requestAnimationFrame(renderFrame);
  });

  onUnmounted(() => {
    cancelAnimationFrame(animationFrameId);
  });

  return {
    itemDefinitions,
    stations,
    inventory: activeInventory,
    storage,
    storageContainer,
    fieldItemInventory,
    placedStructures,
    constructionSites,
    fieldNodes,
    fieldVillagers,
    playerActor,
    visibleFieldNodes,
    pickupFieldNode,
    placeStructure,
    cancelConstructionSite,
    canPlaceStructure,
    isStructurePlaced,
    buildingStatus,
    villagers,
    craftQueue,
    gatherQueue,
    constructionQueue,
    gatherActions,
    playerRecipes,
    isPlayerBusy,
    log,
    stockRules,
    stationAssignments,
    itemCards,
    ownedKinds,
    canStartPlayerRecipe: canStartPlayerRecipeWithState,
    canStartGather,
    isGatherUnlocked,
    gatherActionById,
    availableStations,
    elapsedTime,
    expectedStock,
    isStationAvailable,
    assignedVillagerList,
    unassignedVillagersForStation,
    stationTasks,
    stationRecipes,
    stationCraftEntries,
    canStartStationCraftEntry,
    addStationCraftEntry,
    removeStationCraftEntry,
    updateStationCraftEntryTarget,
    stationTargetItemId,
    craftEntryStatus,
    stationName,
    buildingById,
    villagerNote,
    villagerInventorySummary,
    addVillagerToStation,
    removeVillagerFromStation,
    addVillager,
    onRuleChanged,
    startGather,
    startPlayerCraft,
    startPlayerConstruction,
    startStationCraftEntry,
    recipeById,
    taskLabel,
    stockRuleSourceLabel,
    villagerName,
    taskProgress,
    remainingSeconds,
    gameSpeed,
    setGameSpeed,
    isPlayerAdjacentToStorage,
    isPlayerAdjacentToActor,
    approachTransferTarget,
    moveItemFromActorToStorage,
    moveItemFromStorageToActor,
    moveItemFromActorToActor,
    moveItemFromOtherActorToPlayer,
    dropPlayerItem,
    cancelTask,
    clearLog,
    formatList,
    stockRuleStatus,
  };
}


