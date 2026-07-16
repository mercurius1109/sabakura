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
  beginTaskWork,
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
    const currentDestination = task.phase === "movingToStorage" ? task.storagePoint : task.targetPoint;
    const destination = refreshMovingDestination(task, actor, currentDestination, targetActor);
    if (!destination) {
      return;
    }

    if (task.phase === "movingToStorage") {
      task.storagePoint = destination;
    } else {
      task.targetPoint = destination;
    }

    const arrived = moveActorForTask(actor, destination, deltaMs);
    if (!arrived) {
      task.readyToCompleteAt = null;
      return;
    }

    if (task.phase === "movingToTarget") {
      if (task.kind === "move") {
        if (!task.readyToCompleteAt) {
          task.readyToCompleteAt = now.value + deltaMs;
          return;
        }
        if (now.value < task.readyToCompleteAt) {
          return;
        }
        task.readyToCompleteAt = null;
        finishTaskWork(task);
        return;
      }

      if (task.kind === "transfer") {
        completeTransferTask(task);
        return;
      }

      if (task.kind === "eat") {
        beginTaskWork(task);
        return;
      }

      beginTaskWork(task);
      return;
    }

    if (task.phase === "movingToStorage") {
      if (task.kind === "gather") {
        completeGatherTask(task);
      } else if (task.kind === "craft") {
        completeCraftTask(task);
      }
    }
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
    const destination = task.phase === "movingToStorage" ? task.storagePoint : task.targetPoint;
    if (!actor || !destination) {
      return 0;
    }

    const initialDistance = task.phase === "movingToStorage"
      ? (task.initialStorageDistance ?? task.initialTargetDistance ?? 0)
      : (task.initialTargetDistance ?? 0);
    if (initialDistance <= 0) {
      return distanceBetween(actor, destination) <= 0.0001 ? 100 : 0;
    }

    const remainingDistance = distanceBetween(actor, destination);
    return Math.max(0, Math.min(100, (1 - (remainingDistance / initialDistance)) * 100));
  }

  function taskProgress(task) {
    if (task.phase === "movingToTarget" || task.phase === "movingToStorage") {
      return movingTaskProgress(task);
    }
    if (task.phase === "working") {
      const started = task.workStartedAt || now.value;
      return Math.max(0, Math.min(100, ((now.value - started) / task.duration) * 100));
    }
    return 0;
  }

  function remainingSeconds(task) {
    if (task.phase !== "working") {
      return 0;
    }
    return Math.max(0, Math.ceil((task.duration - (now.value - task.workStartedAt)) / 1000));
  }

  function tick(deltaMs) {
    now.value += deltaMs;
    [...gatherQueue, ...craftQueue, ...constructionQueue].forEach((task) => {
      if (task.phase === "movingToTarget" || task.phase === "movingToStorage") {
        processMovingTask(task, deltaMs);
      } else if (task.phase === "working") {
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
