export function createSurvivalTaskRuntimeLoop({
  now,
  gatherQueue,
  craftQueue,
  constructionQueue,
  actorById,
  distanceBetween,
  moveActorForTask,
  refreshMovingDestination,
  removeTaskFromActiveState,
  completeConstructionTask,
  completeCraftTask,
  completeEatTask,
  completeGatherTask,
  completeTransferTask,
  finishTaskWork,
  respawnFieldNodes,
  checkStockRules,
  checkConstructionSites,
}) {
  function processMovingTask(task, deltaMs) {
    const actor = actorById(task.villagerId);
    if (!actor) {
      return;
    }

    const targetActor = task.actorId ? actorById(task.actorId) : null;
    const destination = refreshMovingDestination(task, actor, task.targetPoint, targetActor);
    if (!destination) {
      return;
    }

    task.targetPoint = destination;

    const arrived = moveActorForTask(actor, destination, deltaMs);
    if (!arrived) {
      task.readyToCompleteAt = null;
      return;
    }

    if (!task.readyToCompleteAt) {
      task.readyToCompleteAt = now.value + deltaMs;
      return;
    }
    if (now.value < task.readyToCompleteAt) {
      return;
    }
    task.readyToCompleteAt = null;
    finishTaskWork(task);
  }

  function processWorkingTask(task) {
    if (task.kind === "transfer") {
      completeTransferTask(task);
      return;
    }

    if (task.kind === "eat") {
      if (!task.workStartedAt || now.value - task.workStartedAt < task.duration) {
        return;
      }
      completeEatTask(task);
      return;
    }

    if (!task.workStartedAt || now.value - task.workStartedAt < task.duration) {
      return;
    }

    if (task.kind === "build") {
      completeConstructionTask(task);
      return;
    }

    const finished = finishTaskWork(task);
    if (finished && task.kind === "craft" && task.workerType === "self") {
      completeCraftTask(task);
      return;
    }

    if (!finished) {
      const actor = actorById(task.villagerId);
      if (actor) {
        removeTaskFromActiveState(task);
      }
    }
  }

  function movingTaskProgress(task) {
    const actor = actorById(task.villagerId);
    const destination = task.targetPoint;
    if (!actor || !destination) {
      return 0;
    }

    const initialDistance = task.initialTargetDistance ?? 0;
    if (initialDistance <= 0) {
      return distanceBetween(actor, destination) <= 0.0001 ? 100 : 0;
    }

    const remainingDistance = distanceBetween(actor, destination);
    return Math.max(0, Math.min(100, (1 - (remainingDistance / initialDistance)) * 100));
  }

  function taskProgress(task) {
    if (task.kind === "move") {
      return movingTaskProgress(task);
    }
    if (task.workStartedAt) {
      const started = task.workStartedAt || now.value;
      return Math.max(0, Math.min(100, ((now.value - started) / task.duration) * 100));
    }
    return 0;
  }

  function remainingSeconds(task) {
    if (!task.workStartedAt) {
      return 0;
    }
    return Math.max(0, Math.ceil((task.duration - (now.value - task.workStartedAt)) / 1000));
  }

  function tick(deltaMs) {
    now.value += deltaMs;
    [...gatherQueue, ...craftQueue, ...constructionQueue].forEach((task) => {
      if (task.kind === "move") {
        processMovingTask(task, deltaMs);
      } else {
        processWorkingTask(task);
      }
    });

    respawnFieldNodes();
    checkStockRules();
    checkConstructionSites();
  }

  return {
    processMovingTask,
    processWorkingTask,
    remainingSeconds,
    taskProgress,
    tick,
  };
}
