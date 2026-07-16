export function createSurvivalTaskRuntimeLoop({
  now,
  gatherQueue,
  craftQueue,
  constructionQueue,
  actorById,
  moveActorForTask,
  refreshMovingDestination,
  isTransferAdjacent,
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
      return;
    }

    if (task.phase === "movingToTarget") {
      if (task.kind === "move") {
        if (!isTransferAdjacent(task, actor, targetActor)) {
          return;
        }
        finishTaskWork(task);
        return;
      }

      if (task.kind === "transfer") {
        if (!isTransferAdjacent(task, actor, targetActor)) {
          return;
        }
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

  function taskProgress(task) {
    if (task.phase === "movingToTarget") {
      return 0;
    }
    if (task.phase === "working") {
      const started = task.workStartedAt || now.value;
      return Math.max(0, Math.min(100, Math.floor(((now.value - started) / task.duration) * 100)));
    }
    if (task.phase === "movingToStorage") {
      return 100;
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
