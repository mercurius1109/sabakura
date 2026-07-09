# Architecture Notes

## Purpose

This project is a prototype, but the game logic should stay reusable for a future production implementation.

The main design goal is:

- prototype quickly in the current Vue app
- avoid locking core game rules to Vue or browser-only APIs

## Guiding Principle

Separate `UI` from `game logic` as early as possible.

The code should be written so that crafting rules, inventory updates, worker assignment, automation rules, and time progression can run without Vue components or DOM access.

## Recommended Layers

### 1. Game Core

The `game-core` layer contains pure gameplay rules and state transitions.

Examples:

- inventory state
- villager state
- recipe definitions
- station availability rules
- crafting start and completion rules
- stock automation rules
- tick-based progression

Rules for this layer:

- no Vue imports
- no DOM access
- no direct component mutation
- no UI wording as business logic
- prefer pure functions such as `state + command -> next state`

### 2. App Layer

The `game-app` layer connects the UI to the core logic.

Examples:

- starting and stopping timers
- save/load behavior
- session management
- converting core events into displayable log text
- creating view models for screens

This layer may know both Vue and the core, but the core should not know this layer exists.

### 3. UI Layer

The `ui` layer renders screens and sends user actions to the app/core layer.

Examples:

- Vue components
- button handlers
- layout and styling
- form state used only for display/input

Rules for this layer:

- do not reimplement gameplay rules in components
- prefer reading derived values from the app/core layer
- keep components thin and easy to replace

## What Belongs Where

### Put in Core

- `hasResources`
- `isRecipeUnlocked`
- `startCraft`
- `completeTask`
- `checkStockRules`
- task progression rules
- expected stock calculations

### Keep out of Core

- `computed` for presentation only
- `setInterval`
- `Date.now()` calls that are not injected as input
- localized log messages
- button selection state used only by the screen

## Data First

Prefer separating master data from behavior.

Recommended examples:

- `items`
- `recipes`
- `stations`
- initial villager definitions
- default automation targets

This makes balancing easier and improves reuse in future clients or tools.

## Type Direction

When expanding the prototype, prefer moving gameplay code to TypeScript first.

Suggested early shared types:

- `GameState`
- `Inventory`
- `Recipe`
- `CraftTask`
- `Villager`
- `StockRule`
- `GameCommand`
- `GameEvent`

Strong shared types will help prevent UI-specific shortcuts from leaking into the core.

## Suggested Directory Shape

```text
src/
  game/
    core/
      rules/
      queries/
      reducers/
      types.ts
    data/
      items.ts
      recipes.ts
      stations.ts
    app/
      createGameSession.ts
      gameLoop.ts
      presenters.ts
  ui/
    components/
    screens/
  composables/
    useGameSession.ts
```

This is a guideline, not a strict rule. The important point is the dependency direction:

`ui -> app -> core`

and never:

`core -> ui`

## Code Review Checklist

Use this checklist during review.

- Does this change move gameplay logic closer to `core`, or further into Vue components?
- Can this rule run without Vue, DOM access, or browser-only APIs?
- Are time and randomness passed in as inputs when practical?
- Is display formatting separated from gameplay decisions?
- Is data defined in reusable structures instead of scattered inline constants?
- Would this logic still work if the UI were replaced with another client?
- Are component methods becoming orchestration code instead of rule code?

## Current Refactor Priority

For this project, the best next refactors are:

1. Move item, station, and recipe definitions out of `App.vue`.
2. Extract gameplay rule functions into `src/game/core`.
3. Keep `App.vue` focused on rendering and input wiring.
4. Introduce shared TypeScript types when the extracted modules stabilize.

## Decision Rule

When unsure where code should live, ask:

"Is this code describing how the game works, or how this screen works?"

If it describes how the game works, it should usually live outside the Vue component tree.
