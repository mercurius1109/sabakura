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
    ...percentPointToWorld({ x: 50, y: 78 }),
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
      ...percentPointToWorld({ x: 24, y: 18 }),
    }),
  ]);
  const tasksById = reactive({});
  const craftQueue = reactive([]);
  const gatherQueue = reactive([]);
  const constructionQueue = reactive([]);
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
    return gatherQueue;
  }

  function activateQueuedTask(actor, task) {
    const queue = activeQueueForTask(task);
    if (!actor || !task || !queue) {
      return false;
    }
    if (task.phase === "working" && !task.workStartedAt) {
      task.workStartedAt = now.value;
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

  const {
    actorWorkPoint,
    actorInteractionDistance,
    buildingWorkPoint,
    distanceBetween,
    fieldNodeById,
    fieldNodeIndexById,
    findGatherTargetNode,
    gatherActionForNode,
    isFieldNodeVisible,
    moveActorForTask,
    nodeWorkPoint,
    spawnDroppedItems,
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
    scheduleActorTask,
    t,
  });

  function startPlayerCraft(recipeId) {
    if (!cancelPlayerTaskForManualAction()) {
      return false;
    }
    return startPlayerCraftTask(recipeId, isPlayerBusy);
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
    nodeWorkPoint,
    storageWorkPoint,
    distanceBetween,
    actorInventoryCount,
    shouldVillagerContinue,
    gatherActionById,
    findGatherTargetNode,
    addItemToStore: addItem,
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
    t,
  });

  const {
    approachTransferTarget,
    dropPlayerItem,
    isPlayerAdjacentToActor,
    isPlayerAdjacentToStorage,
    moveItemFromActorToActor,
    moveItemFromActorToStorage,
    moveItemFromOtherActorToPlayer,
    moveItemFromStorageToActor,
    movePlayerTo,
    queuePlayerTransfer,
  } = createPlayerActions({
    playerActor,
    storage,
    storageContainer,
    placedStructures,
    storagePointWorld,
    buildingById,
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
    findTaskById,
    taskLabel,
    taskPhaseLabel,
    stockRuleSourceLabel,
    villagerName,
    taskProgress,
    remainingSeconds,
    gameSpeed,
    setGameSpeed,
    isPlayerAdjacentToStorage,
    isPlayerAdjacentToActor,
    approachTransferTarget,
    movePlayerTo,
    moveItemFromActorToStorage,
    moveItemFromStorageToActor,
    moveItemFromActorToActor,
    moveItemFromOtherActorToPlayer,
    dropPlayerItem,
    cancelTask,
    clearLog,
    formatList,
    stockRuleStatus,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
  };
}


