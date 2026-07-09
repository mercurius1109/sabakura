# Implementation Guidelines

## Purpose

This document translates the current game design direction into day-to-day implementation rules.

Use it when:

- adding new UI
- adding new game systems
- reviewing automation features
- deciding whether something belongs to the player or villagers

## One-Line Rule

`The player decides the plan. Villagers execute the plan.`

If an implementation blurs that line, stop and review it.

## UI Rules

### UI Should Expose Decisions Clearly

The UI should help the player make plans.

Prefer UI that makes these actions explicit:

- register a recipe
- set a target stock amount
- assign villagers to a facility
- remove or revise an existing plan
- inspect why work is blocked

Avoid UI that hides these choices behind implicit behavior.

### UI Should Show Cause And Effect

When work is not progressing, the player should be able to tell why.

Good UI states include:

- no assigned villager
- recipe not registered
- stock target already reached
- missing tool
- missing materials in storage
- facility not unlocked
- villager already busy

The player should not have to guess why nothing is happening.

### UI Should Favor Editing Over Passive Watching

If a screen only displays status but offers no meaningful control, ask whether it should exist.

Preferred interaction patterns:

- add/remove assignment
- add/remove craft registration
- change stock target
- reorder or reprioritize plans later if needed

Status is important, but status alone is not the core of the game.

### UI Should Not Pretend Strategy Is Automatic

Do not imply that the game is "smartly managing everything" unless that is intentionally part of the design.

Examples to avoid:

- hidden auto-reassignment
- auto-created production plans
- silently changed stock targets
- invisible priority changes

If strategy changes, it should usually be because the player changed it.

## Game Logic Rules

### Villagers Execute Registered Intent

Villagers may:

- repeat gathering
- use assigned facilities
- continue registered production until target is met
- carry required tools if rules allow

Villagers should not:

- invent new recipes to craft
- create new facility work on their own
- change stock goals
- move themselves to a different strategy automatically

### Automation Stops Before Strategy

Safe automation:

- continue until target is met
- consume known inputs
- produce known outputs
- use assigned villagers
- use registered jobs

Unsafe automation:

- choose what should be produced next globally
- decide which shortage matters most
- rewrite the player's plan
- solve bottlenecks by hidden reconfiguration

### Storage And Inventory Rules Must Stay Explicit

Whenever items move, the code should make the movement clear.

Examples:

- storage -> villager inventory
- villager inventory -> storage
- storage -> crafting input
- gathering output -> storage

This matters for both debugging and future balance work.

### Blocked Work Should Be Queryable

For any automated work, the code should make it easy to answer:

- why it started
- why it stopped
- why it cannot restart

Prefer functions that produce simple statuses instead of burying the reason inside side effects.

### Expansion Should Unlock Capability, Not Remove Decisions

When adding new stations, recipes, or villagers:

- expansion should increase options
- expansion should increase planning complexity
- expansion should not eliminate the need to plan

If a new unlock only makes the game more passive, reconsider it.

## Review Checklist

Use this checklist before or during review.

### UI Review

- Does the UI ask the player to make a plan?
- Can the player see why work is blocked?
- Can the player revise a plan without fighting the interface?
- Does the UI reveal hidden automation that should be explicit?

### Logic Review

- Are villagers executing a player-defined plan rather than inventing one?
- Is any automatic behavior crossing into strategy?
- Are item transfers explicit and understandable?
- Can blocked states be explained in code and in UI?
- Does this feature preserve the player's role during shortages and expansion?

## Preferred Future Additions

Features that fit this direction well:

- plan priority controls
- emergency override or pause controls
- shortages that force reprioritization
- unlocks that create new tradeoffs
- better explanations for blocked automation

## Risky Future Additions

Features that should be treated carefully:

- full auto-planning
- global auto-optimization
- villagers choosing their own priorities
- systems that silently "fix" player mistakes
- mechanics that reduce intervention during crises

## Team Rule

When a proposed feature feels convenient, ask:

`Is this removing busywork, or removing judgment?`

Removing busywork is usually good.
Removing judgment is often dangerous for this game.
