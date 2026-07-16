# Task Queue Architecture

## Goal

This prototype is being shaped so that game logic can be reused later in a fuller game implementation.
To keep that path open, actor behavior is moving toward a small explicit task system instead of UI-driven special cases.

## Core ideas

- Every actor owns a task queue.
- A task is an executable unit, not a hidden plan or UI-only label.
- Movement is also a task.
- Follow-up work is queued explicitly as the next task.
- Task completion is responsible for producing results and consuming resources.
- Display state is derived from queued tasks instead of ad hoc flags.

## Current model

An actor has:

- `taskQueue`: ordered task ids
- `taskId`: active task id
- `currentTaskId`: currently displayed active task id

Tasks currently include:

- `move`
- `gather`
- `craft`
- `build`
- `transfer`

Typical flow:

1. Queue `move`
2. Queue `gather` or `craft` or `build` or `transfer`
3. Runtime promotes the next queued task when the active task completes

This is intentionally simple:

- no hidden `__planned` continuation
- no implicit restart side channel for the next step
- queued work is inspectable from UI and logs

## Why this helps

- Player and villager logic can share the same execution model.
- Future work like long production chains can be expressed as queued tasks.
- Cancellation becomes easier because we can clear queued tasks directly.
- Rendering can show “what will happen next” instead of only the current action.
- Porting to another runtime later becomes easier because the task system is UI-agnostic.

## Current cleanup direction

The runtime has started to split into:

- `useSurvivalTaskRuntimeFactories.js`
  - task creation and enqueue helpers
- `useSurvivalTaskRuntimeHandlers.js`
  - task completion rules
- `useSurvivalTaskRuntimeLoop.js`
  - tick loop and task progression
- `useSurvivalTaskRuntime.js`
  - dependency wiring

This keeps each file smaller and reduces the risk of unrelated regressions while editing.

## Remaining work

- Remove the remaining `phase` dependency where it is only standing in for separate tasks.
- Unify task failure handling so every task type cancels or retries consistently.
- Move more display text to i18n-backed task descriptions.
- Consider serializable task payloads if save/load is added.

## Rule of thumb for future additions

When adding a new actor action:

1. Decide whether it is really one task or multiple tasks.
2. If movement is required, queue `move` separately.
3. Make resource consumption happen at completion unless there is a strong gameplay reason not to.
4. Keep task data independent from Vue component state.
5. Prefer explicit queued follow-up tasks over hidden branching flags.
