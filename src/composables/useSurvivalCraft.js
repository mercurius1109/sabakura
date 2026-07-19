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
  fieldTreeConfigs as rawFieldTreeConfigs,
  gatherActions as rawGatherActions,
  genericDropOffsets,
  playerDropPoint,
  storagePoint,
  villagerNamePool,
} from "../game/data/survivalConfig.js";
import { createActor } from "../game/core/actors.js";
import { addItem, createContainer, createItemStore, removeItem, transferItem } from "../game/core/containers.js";
import {
  createInitialFieldNodes as createCoreInitialFieldNodes,
  randomFieldPosition as createRandomFieldPosition,
} from "../game/core/field.js";
import {
  clampWorldPosition,
  percentOffsetToWorld,
  percentPointToWorld,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../game/core/world.js";
import {
  actorCanTakeRequiredItem as canActorTakeRequiredItem,
  actorHasItem,
  actorInventoryCount,
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
import { createPlayerActions } from "./survival/usePlayerActions.js";
import { t } from "../i18n/index.js";

const playerMoveSpeedPerSecond = 600;
const villagerMoveSpeedPerSecond = 80;
const tickIntervalMs = 250;
const defaultGameSpeed = 1;
const fullnessDecayPerSecond = 0.2;
const autoEatThreshold = 35;
const eatDurationMs = 1800;
const actorSpeechDurationMs = 2200;

export function useSurvivalCraft(options = {}) {
  const {
    preventPlayerFullnessDecay = null,
  } = options;
  const itemDefinitions = Object.fromEntries(
    Object.entries(rawItemDefinitions).map(([id, meta]) => [
      id,
      { ...meta, name: t(meta.nameKey) },
    ]),
  );
  const fuelItemIds = Object.entries(itemDefinitions)
    .filter(([, meta]) => meta.fuel?.burnDurationMs > 0)
    .map(([id]) => id);
  const recipes = rawRecipes.map((recipe) => ({ ...recipe, name: t(recipe.nameKey) }));
  const stations = rawStations.map((station) => ({
    ...station,
    name: t(station.nameKey),
    description: t(station.descriptionKey),
  }));
  const gatherActions = rawGatherActions.map((action) => ({ ...action, label: t(action.labelKey) }));
  const buildingDefinitions = rawBuildingDefinitions.map((building) => ({
    ...building,
    ...percentPointToWorld(building),
    name: t(building.nameKey),
  }));
  const fieldResourceConfigs = rawFieldResourceConfigs.map((config) => ({
    ...config,
    title: t(config.titleKey),
    actionLabel: t(config.actionLabelKey),
  }));
  const fieldTreeNodes = rawFieldTreeConfigs.map((config) => ({
    ...config,
    title: t(config.titleKey),
    actionLabel: t(config.actionLabelKey),
  }));
  const storagePointWorld = percentPointToWorld(storagePoint);
  const playerDropPointWorld = percentPointToWorld(playerDropPoint);
  const droppedLogOffsetsWorld = droppedLogOffsets.map(percentOffsetToWorld);
  const genericDropOffsetsWorld = genericDropOffsets.map(percentOffsetToWorld);

  function createInitialFieldNodes() {
    return createCoreInitialFieldNodes(fieldResourceConfigs, fieldTreeNodes);
  }

  const startedAt = Date.now();
  const now = ref(Date.now());
  const displayNow = ref(now.value);
  const lastTickAt = ref(Date.now());
  const gameSpeed = ref(defaultGameSpeed);
  const storageContainer = reactive(createContainer({
    id: "storage",
    kind: "storage",
    name: t("ui.storage"),
    inventory: reactive(createItemStore()),
  }));
  const stationContainers = reactive({
    cookingStation: reactive(createContainer({
      id: "station-cooking",
      kind: "station",
      name: t("station.cookingStation.name"),
      inventory: reactive(createItemStore()),
    })),
  });
  const stationFuelState = reactive({
    cookingStation: reactive({
      burnRemainingMs: 0,
      burnDurationMs: 0,
      fuelItemId: null,
    }),
  });
  const storage = storageContainer.inventory;
  const playerActor = reactive(createActor({
    id: "player",
    kind: "player",
    name: t("ui.playerName"),
    ...percentPointToWorld({ x: 50, y: 78 }),
  }));
  const placedStructures = reactive({
    workbench: false,
    lumberjackHut: false,
    cookingStation: false,
    storage: false,
  });
  const structurePositions = reactive({});
  const constructionSites = reactive([]);
  const fieldNodes = reactive(createInitialFieldNodes());
  const villagers = reactive(
    Array.from({ length: 9 }, (_, index) =>
      createActor({
        id: `villager-${index + 1}`,
        name: villagerNamePool[index] || `Villager ${index + 1}`,
        ...percentPointToWorld({
          x: 24 + (index % 3) * 6,
          y: 18 + Math.floor(index / 3) * 6,
        }),
      })),
  );
  const tasksById = reactive({});
  const craftQueue = reactive([]);
  const gatherQueue = reactive([]);
  const constructionQueue = reactive([]);
  const inventoryFlyRequests = reactive([]);
  const fieldTransferFlyRequests = reactive([]);
  const log = reactive([]);
  const stockRules = reactive(
    gatherActions.map((action) => ({
      id: `stock-${action.id}`,
      kind: "gather",
      actionId: action.id,
      itemId: action.itemId,
      enabled: false,
      target: defaultTargets[action.itemId],
    })),
  );
  const stationAssignments = reactive(
    Object.fromEntries(
      [...stations, { id: "storage" }].map((station) => [
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

  function requestInventoryFlyToPlayer(itemId, actor, amount = 1) {
    if (!itemId || !actor || actor.id !== playerActor.id) {
      return;
    }

    const request = {
      id: makeId("inventory-fly"),
      itemId,
      amount: Math.max(1, Number(amount) || 1),
      originX: Number.isFinite(actor.renderX) ? actor.renderX : actor.x,
      originY: Number.isFinite(actor.renderY) ? actor.renderY : actor.y,
    };

    inventoryFlyRequests.push(request);
    window.setTimeout(() => {
      const index = inventoryFlyRequests.findIndex((entry) => entry.id === request.id);
      if (index >= 0) {
        inventoryFlyRequests.splice(index, 1);
      }
    }, 1200);
  }

  function requestFieldTransferFly(itemId, from, to, amount = 1) {
    if (!itemId || !from || !to) {
      return;
    }

    const request = {
      id: makeId("field-transfer-fly"),
      itemId,
      amount: Math.max(1, Number(amount) || 1),
      from,
      to,
    };

    fieldTransferFlyRequests.push(request);
    window.setTimeout(() => {
      const index = fieldTransferFlyRequests.findIndex((entry) => entry.id === request.id);
      if (index >= 0) {
        fieldTransferFlyRequests.splice(index, 1);
      }
    }, 1200);
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

  function stationContainerById(stationId) {
    return stationContainers[stationId] || null;
  }

  function stationInventory(stationId) {
    return stationContainerById(stationId)?.inventory || null;
  }

  function stationFuelInfo(stationId) {
    return stationFuelState[stationId] || null;
  }

  function stationFuelCount(stationId) {
    const inventory = stationInventory(stationId);
    if (!inventory) {
      return 0;
    }
    return fuelItemIds.reduce((total, itemId) => total + (inventory[itemId] || 0), 0);
  }

  function stationHasFuel(stationId) {
    const fuelInfo = stationFuelInfo(stationId);
    if (!fuelInfo) {
      return true;
    }
    return fuelInfo.burnRemainingMs > 0 || stationFuelCount(stationId) > 0;
  }

  function stationIsBurning(stationId) {
    return Boolean(stationFuelInfo(stationId)?.burnRemainingMs > 0);
  }

  function refuelStationFromStoredFuel(stationId) {
    const fuelInfo = stationFuelInfo(stationId);
    const container = stationContainerById(stationId);
    if (!fuelInfo || !container || fuelInfo.burnRemainingMs > 0) {
      return false;
    }

    const fuelItemId = fuelItemIds.find((itemId) => (container.inventory?.[itemId] || 0) > 0);
    if (!fuelItemId || !removeItem(container, fuelItemId, 1)) {
      return false;
    }
    fuelInfo.fuelItemId = fuelItemId;
    fuelInfo.burnDurationMs = itemDefinitions[fuelItemId]?.fuel?.burnDurationMs || 0;
    fuelInfo.burnRemainingMs = fuelInfo.burnDurationMs;
    addLog(t("log.stationFuelStarted", {
      station: stationName(stationId),
      fuel: itemName(fuelItemId),
    }));
    return true;
  }

  function updateStationFuel(deltaMs) {
    Object.keys(stationFuelState).forEach((stationId) => {
      const fuelInfo = stationFuelInfo(stationId);
      if (!fuelInfo) {
        return;
      }

      if (fuelInfo.burnRemainingMs > 0) {
        fuelInfo.burnRemainingMs = Math.max(0, fuelInfo.burnRemainingMs - deltaMs);
      }

      if (fuelInfo.burnRemainingMs <= 0) {
        refuelStationFromStoredFuel(stationId);
      }
    });
  }

  function taskCanWork(task) {
    if (task?.kind === "craft" && task.station === "cookingStation") {
      return stationIsBurning("cookingStation");
    }
    return true;
  }

  function handleBlockedTask(task) {
    if (
      !task
      || task.kind !== "craft"
      || task.station !== "cookingStation"
      || task.workerType !== "villager"
      || task.refuelRequested
      || stationHasFuel(task.station)
    ) {
      return false;
    }

    const villager = actorById(task.villagerId);
    if (!villager) {
      return false;
    }

    const canRefuelNow = fuelItemIds.some((itemId) => villagerHasItem(villager, itemId))
      || (placedStructures.storage && fuelItemIds.some((itemId) => availableItemCount(itemId) > 0));
    if (!canRefuelNow) {
      return false;
    }

    task.refuelRequested = true;
    removeTaskFromActiveState(task);

    const queued = prepareVillagerStationFuel(villager, task.station, task);
    if (queued) {
      return true;
    }

    task.refuelRequested = false;
    scheduleActorTask(villager, task);
    return false;
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

  function localActorById(actorId) {
    if (actorId === playerActor.id) {
      return playerActor;
    }
    return villagers.find((entry) => entry.id === actorId) || null;
  }

  function ownerActorIdForTask(task) {
    if (!task) {
      return null;
    }
    return task.ownerActorId || task.villagerId || (task.workerType === "self" ? playerActor.id : null);
  }

  function registerTask(task) {
    if (!task?.id) {
      return null;
    }
    tasksById[task.id] = task;
    return task;
  }

  function unregisterTask(taskId) {
    if (!taskId || !tasksById[taskId]) {
      return null;
    }
    const task = tasksById[taskId];
    delete tasksById[taskId];
    return task;
  }

  function findTaskById(taskId) {
    return taskId ? tasksById[taskId] || null : null;
  }

  function activeQueueForTask(task) {
    if (!task) {
      return null;
    }
    if (task.kind === "craft") {
      return craftQueue;
    }
    if (task.kind === "build") {
      return constructionQueue;
    }
    if (task.kind === "eat") {
      return gatherQueue;
    }
    return gatherQueue;
  }

  function activateQueuedTask(actor, task) {
    const queue = activeQueueForTask(task);
    if (!actor || !task || !queue) {
      return false;
    }
    if (task.kind !== "move" && !task.workStartedAt) {
      task.workStartedAt = now.value;
      task.workElapsedMs = 0;
    }
    task.ownerActorId = actor.id;
    registerTask(task);
    actor.taskId = task.id;
    actor.currentTaskId = task.id;
    if (!queue.some((entry) => entry.id === task.id)) {
      queue.push(task);
    }
    return true;
  }

  function scheduleActorTask(actor, task) {
    if (!actor || !task) {
      return false;
    }
    task.ownerActorId = actor.id;
    registerTask(task);
    if (!actor.taskQueue.includes(task.id)) {
      actor.taskQueue.push(task.id);
    }
    if (actor.taskQueue[0] === task.id && actor.taskId === null) {
      return activateQueuedTask(actor, task);
    }
    return true;
  }

  function normalizeTaskForActivation(task, actor) {
    if (!task || !actor) {
      return task;
    }
    return task;
  }

  function promoteNextActorTask(actor) {
    if (!actor || actor.taskId !== null) {
      return false;
    }
    const nextTask = findTaskById(actor.taskQueue[0]);
    if (!nextTask) {
      return false;
    }
    return activateQueuedTask(actor, normalizeTaskForActivation(nextTask, actor));
  }

  function removeTaskFromActorQueue(task) {
    const actor = localActorById(ownerActorIdForTask(task));
    if (!actor || !task) {
      return null;
    }
    const taskIndex = actor.taskQueue.findIndex((taskId) => taskId === task.id);
    if (taskIndex >= 0) {
      actor.taskQueue.splice(taskIndex, 1);
    }
    if (actor.taskId === task.id) {
      actor.taskId = null;
      actor.currentTaskId = null;
    }
    unregisterTask(task.id);
    promoteNextActorTask(actor);
    return actor;
  }

  function removeTaskFromActiveState(task) {
    if (!task) {
      return false;
    }
    const queue = queueForTask(task);
    if (queue) {
      const index = queue.findIndex((entry) => entry.id === task.id);
      if (index >= 0) {
        queue.splice(index, 1);
      }
    }
    removeTaskFromActorQueue(task);
    return true;
  }

  function clearActorQueuedTasks(actor) {
    if (!actor) {
      return;
    }
    actor.taskQueue.forEach((taskId) => {
      unregisterTask(taskId);
    });
    actor.taskQueue.splice(0);
    actor.taskId = null;
    actor.currentTaskId = null;
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

  function showActorSpeech(actor, text, durationMs = actorSpeechDurationMs) {
    if (!actor || !text) {
      return;
    }
    actor.speechText = text;
    actor.speechUntil = now.value + durationMs;
  }

  const {
    actorWorkPoint,
    actorInteractionDistance,
    buildingWorkPoint,
    distanceBetween,
    displayFieldNodes,
    fieldNodeById,
    fieldNodeIndexById,
    findGatherTargetNode,
    gatherActionForNode,
    isFieldNodeVisible,
    moveActorForTask,
    nodeWorkPoint,
    spawnDroppedItems,
    spawnScatteredItems,
    spawnDroppedLogs,
    storageInteractionDistance,
    storageWorkPoint,
    visibleFieldNodes,
  } = createSurvivalFieldHelpers({
    fieldNodes,
    now,
    playerMoveSpeedPerSecond,
    villagerMoveSpeedPerSecond,
    droppedLogOffsets: droppedLogOffsetsWorld,
    genericDropOffsets: genericDropOffsetsWorld,
    playerDropPoint: playerDropPointWorld,
    storagePoint: storagePointWorld,
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
    itemDefinitions,
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
    actorCanWork,
    stationHasFuelForRecipe,
    canStartStationCraftEntry,
    craftEntryStatus,
    findTaskById: managementFindTaskById,
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
    actorInventoryCount,
    inventorySummary,
    assignedStationsSummary,
    checkStockRules: requestCheckStockRules,
    checkConstructionSites: requestCheckConstructionSites,
    fuelItemIds,
    stationHasFuel,
    t,
  });

  const {
    canStartGather,
    prepareVillagerStationFuel,
    prepareActorRequiredItem,
    prepareVillagerRequiredItem,
    startActorApproachTask,
    startActorFieldTask,
    startActorGatherTask,
    startActorPickupTask,
    startConstruction,
    startCraft,
    startGather,
    startPlayerConstruction: startPlayerConstructionTask,
    startPlayerCraft: startPlayerCraftTask,
    startPlayerFieldTask: startPlayerFieldTaskCore,
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
    expectedStock,
    stockRuleTarget: (ruleId) => stockRules.find((rule) => rule.id === ruleId)?.target || 0,
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
    actorInventoryCount,
    actorCanWork,
    showActorSpeech,
    scheduleActorTask,
    fuelItemIds,
    stationHasFuel,
    stationContainerById,
    t,
  });

  function startPlayerCraft(recipeId, options = {}) {
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }
    return startPlayerCraftTask(recipeId, isPlayerBusy, options);
  }

  function startPlayerFieldTask(nodeId) {
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }
    return startPlayerFieldTaskCore(nodeId);
  }

  function startPlayerConstruction(structureId) {
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }
    return startPlayerConstructionTask(structureId);
  }

  function canStartPlayerRecipeWithState(recipe) {
    return canStartPlayerRecipeAction(recipe, isPlayerBusy);
  }

  const {
    canStartPlayerRecipe: canStartPlayerRecipeAction,
    pickupFieldNode,
    restartVillagerTask,
    shouldVillagerContinue,
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
    actorInventoryCount,
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
    stationHasFuel,
    startCraft,
    randomFieldPosition,
    startConstruction,
  });

  const {
    remainingSeconds,
    taskProgress: runtimeTaskProgress,
    tick,
  } = createSurvivalTaskRuntime({
    now,
    playerActor,
    placedStructures,
    storageContainer,
    stationContainerById,
    storagePoint: storagePointWorld,
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
    spawnScatteredItems,
    nodeWorkPoint,
    storageWorkPoint,
    distanceBetween,
    actorInventoryCount,
    gatherActionById,
    findGatherTargetNode,
    removeItemFromStore: removeItem,
    consumeActorResources,
    restartVillagerTask,
    respawnFieldNodes,
    checkStockRules,
    checkConstructionSites,
    moveActorForTask,
    actorInteractionDistance,
    buildingById,
    storageInteractionDistance,
    removeTaskFromActiveState,
    scheduleActorTask,
    makeId,
    itemDefinitions,
    showActorSpeech,
    requestInventoryFlyToPlayer,
    requestFieldTransferFly,
    taskCanWork,
    handleBlockedTask,
    updateStationFuel,
    t,
  });

  const {
    approachStructureTarget,
    approachTransferTarget,
    dropPlayerItem,
    isPlayerAdjacentToActor,
    isPlayerAdjacentToStorage,
    isPlayerAdjacentToStructure,
    moveItemFromActorToActor,
    moveItemFromActorToStorage,
    moveItemFromActorToStation,
    moveItemFromOtherActorToPlayer,
    moveItemFromStorageToActor,
    moveItemFromStationToActor,
    movePlayerTo,
    queuePlayerTransfer,
  } = createPlayerActions({
    playerActor,
    storage,
    storageContainer,
    placedStructures,
    storagePointWorld,
    buildingById,
    buildingWorkPoint,
    actorById,
    actorWorkPoint,
    storageWorkPoint,
    distanceBetween,
    storageInteractionDistance,
    actorInteractionDistance,
    cancelPlayerTaskForManualAction,
    scheduleActorTask,
    makeId,
    addLog,
    itemName,
    actorHasItem,
    transferItem,
    removeItem,
    spawnDroppedItems,
    requestFieldTransferFly,
    stationContainerById,
  });

  function setGameSpeed(nextSpeed) {
    if (![0.1, 1, 10].includes(nextSpeed)) {
      return;
    }
    gameSpeed.value = nextSpeed;
    addLog(`Game speed set to x${nextSpeed}.`);
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

  function edibleItemEntries() {
    return Object.entries(itemDefinitions).filter(([, meta]) => Number(meta?.nutrition) > 0);
  }

  function bestFoodItemInInventory(actor) {
    return edibleItemEntries()
      .filter(([itemId]) => (actor?.inventory?.[itemId] || 0) > 0)
      .sort((a, b) => (b[1].nutrition || 0) - (a[1].nutrition || 0))[0]?.[0] || null;
  }

  function bestFoodItemInStorage() {
    if (!placedStructures.storage) {
      return null;
    }
    return edibleItemEntries()
      .filter(([itemId]) => (storage[itemId] || 0) > 0)
      .sort((a, b) => (b[1].nutrition || 0) - (a[1].nutrition || 0))[0]?.[0] || null;
  }

  function actorFullnessPercent(actor) {
    const max = Math.max(1, actor?.maxFullness || 100);
    return Math.max(0, Math.min(100, Math.round(((actor?.fullness || 0) / max) * 100)));
  }

  function actorIsStarving(actor) {
    return Boolean(actor && actor.fullness <= 0);
  }

  function actorNeedsFood(actor) {
    return Boolean(actor && actor.fullness <= autoEatThreshold);
  }

  function movementGoalProgress(task, actor = null) {
    if (!task || task.kind !== "move") {
      return 0;
    }

    const movingActor = actor || actorById(task.villagerId);
    if (!movingActor) {
      return 0;
    }

    const initialDistance = task.initialTargetDistance ?? 0;
    const destination = task.targetPoint;
    if (!destination) {
      return 0;
    }
    const remainingDistance = distanceBetween(movingActor, destination);

    if (initialDistance <= 0) {
      return remainingDistance <= 0.0001 ? 100 : 0;
    }

    return Math.max(0, Math.min(100, (1 - (remainingDistance / initialDistance)) * 100));
  }

  function taskProgress(task, actor = null) {
    if (task?.kind === "move") {
      return movementGoalProgress(task, actor);
    }
    return runtimeTaskProgress(task);
  }

  function createEatTask(actor, itemId, itemSource = "inventory") {
    const food = itemDefinitions[itemId];
    if (!actor || !food?.nutrition) {
      return null;
    }

    return {
      id: makeId("eat"),
      kind: "eat",
      itemId,
      itemSource,
      workerType: actor.id === playerActor.id ? "self" : "villager",
      villagerId: actor.id,
      station: itemSource === "storage" ? "storage" : "hand",
      source: "eat",
      workStartedAt: null,
      duration: eatDurationMs,
    };
  }

  function hasQueuedEatTask(actor) {
    return Boolean(actor?.taskQueue?.some((taskId) => findTaskById(taskId)?.kind === "eat"));
  }

  function clearNonEatTasks(actor) {
    if (!actor) {
      return;
    }

    [...(actor.taskQueue || [])]
      .map((taskId) => findTaskById(taskId))
      .filter(Boolean)
      .filter((task) =>
        task.kind !== "eat"
        && task.kind !== "move"
        && task.kind !== "gather"
        && task.kind !== "transfer")
      .forEach((task) => removeTaskFromActiveState(task));
  }

  function scheduleAutoEat(actor) {
    if (!actor || actor.taskId !== null || hasQueuedEatTask(actor)) {
      return false;
    }

    const carriedFood = bestFoodItemInInventory(actor);
    const storageFood = carriedFood ? null : bestFoodItemInStorage();
    const itemId = carriedFood || storageFood;
    if (!itemId) {
      return false;
    }

    const task = createEatTask(actor, itemId, carriedFood ? "inventory" : "storage");
    if (!task) {
      return false;
    }
    if (carriedFood) {
      return scheduleActorTask(actor, task);
    }

    const targetPoint = storageWorkPoint(actor);
    return distanceBetween(actor, targetPoint) <= 0.0001
      ? scheduleActorTask(actor, task)
      : startActorApproachTask(actor, targetPoint, t("log.moveToStorage", { actor: actor.name, item: itemName(itemId) }), task);
  }

  function eatPlayerItem(itemId) {
    const food = itemDefinitions[itemId];
    if (!food?.nutrition || (playerActor.inventory[itemId] || 0) <= 0) {
      return false;
    }
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }
    const task = createEatTask(playerActor, itemId, "inventory");
    return task ? scheduleActorTask(playerActor, task) : false;
  }

  function restorePlayerFullness() {
    playerActor.fullness = playerActor.maxFullness || 100;
    return true;
  }

  function updateActorFullness(actor, deltaMs) {
    if (!actor) {
      return;
    }
    if (actor.id === playerActor.id && preventPlayerFullnessDecay?.value) {
      return;
    }
    actor.fullness = Math.max(0, actor.fullness - (fullnessDecayPerSecond * deltaMs) / 1000);
  }

  function enforceHunger(actor) {
    if (!actor) {
      return;
    }

    const isPlayer = actor.id === playerActor.id;

    if (actorIsStarving(actor)) {
      clearNonEatTasks(actor);
      if (!isPlayer) {
        scheduleAutoEat(actor);
      }
      return;
    }

    if (!isPlayer && actorNeedsFood(actor) && actor.taskId === null) {
      scheduleAutoEat(actor);
    }
  }

  function updateFullness(deltaMs) {
    [playerActor, ...villagers].forEach((actor) => {
      updateActorFullness(actor, deltaMs);
      enforceHunger(actor);
    });
  }

  function cancelTask(taskId) {
    const task = findTaskById(taskId);
    if (!task) {
      return false;
    }
    removeTaskFromActiveState(task);

    addLog(t("log.taskCancelled", { task: taskLabel(task) }));
    return true;
  }

  function cancelTasksForActor(actorId, { suppressLog = false } = {}) {
    if (!actorId) {
      return false;
    }

    const targetActor = actorById(actorId);
    const queues = [gatherQueue, craftQueue, constructionQueue];
    const tasks = queues.flatMap((queue) => queue.filter((task) => task.villagerId === actorId));
    if (tasks.length === 0) {
      if (targetActor) {
        clearActorQueuedTasks(targetActor);
      }
      return true;
    }

    tasks.forEach((task) => {
      removeTaskFromActiveState(task);

      if (!suppressLog) {
        addLog(t("log.taskCancelled", { task: taskLabel(task) }));
      }
    });

    if (targetActor) {
      clearActorQueuedTasks(targetActor);
    }

    return true;
  }

  function cancelPlayerTaskForManualAction() {
    if (!playerActor) {
      return false;
    }

    const playerTasks = [
      ...gatherQueue.filter((task) => task.villagerId === playerActor.id || task.workerType === "self"),
      ...craftQueue.filter((task) => task.villagerId === playerActor.id || task.workerType === "self"),
      ...constructionQueue.filter((task) => task.villagerId === playerActor.id || task.workerType === "self"),
    ];

    if (playerTasks.length === 0) {
      clearActorQueuedTasks(playerActor);
      return true;
    }

    playerTasks.forEach((task) => {
      removeTaskFromActiveState(task);

      addLog(t("log.taskCancelled", { task: taskLabel(task) }));
    });

    clearActorQueuedTasks(playerActor);
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
      updateFullness(tickIntervalMs);
      tick(tickIntervalMs);
      accumulatedTickMs -= tickIntervalMs;
      lastTickAt.value = Date.now();
    }

    const alpha = Math.max(0, Math.min(1, accumulatedTickMs / tickIntervalMs));
    displayNow.value = now.value + accumulatedTickMs;

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
    buildingDefinitions,
    stations,
    inventory: activeInventory,
    storage,
    storageContainer,
    stationContainers,
    stationFuelState,
    fieldItemInventory,
    placedStructures,
    constructionSites,
    fieldNodes,
    fieldVillagers,
    playerActor,
    inventoryFlyRequests,
    fieldTransferFlyRequests,
    displayFieldNodes,
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
    stationHasFuel,
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
    findTaskById,
    taskLabel,
    taskPhaseLabel,
    stockRuleSourceLabel,
    villagerName,
    taskProgress,
    displayNow,
    remainingSeconds,
    gameSpeed,
    setGameSpeed,
    isPlayerAdjacentToStorage,
    isPlayerAdjacentToActor,
    isPlayerAdjacentToStructure,
    approachStructureTarget,
    approachTransferTarget,
    movePlayerTo,
    moveItemFromActorToStorage,
    moveItemFromStorageToActor,
    moveItemFromActorToStation,
    moveItemFromStationToActor,
    moveItemFromActorToActor,
    moveItemFromOtherActorToPlayer,
    dropPlayerItem,
    eatPlayerItem,
    restorePlayerFullness,
    cancelTask,
    clearLog,
    addLog,
    formatList,
    stockRuleStatus,
    actorFullnessPercent,
    actorIsStarving,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
  };
}


