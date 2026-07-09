# Game Design Guidelines

## Core Direction

This prototype should preserve one clear role split:

- the player decides
- villagers execute

The game should stay interesting because the player is responsible for planning, prioritization, expansion, and recovery from trouble.

The game should not become fully self-solving.

## Design Pillar

Use this sentence as the main design rule:

`The player creates and revises plans. Villagers carry out those plans.`

This means automation is allowed, but only as execution of player intent.

## Where The Fun Should Live

The main source of fun is not repetitive clicking.

The main source of fun should be:

- deciding what to produce
- deciding how much stock to keep
- deciding which villager should support which facility
- deciding when to expand production
- deciding how to respond when the current plan stops working

## Player Responsibilities

The player should be the one who:

- registers crafting plans
- sets stock targets
- assigns or reassigns villagers
- unlocks new production capability
- changes priorities during shortages
- responds to crises or bottlenecks
- decides when to expand the village

If a system removes these decisions entirely, it is probably reducing the game's identity.

## Villager Responsibilities

Villagers should be the ones who:

- repeat assigned gathering work
- use assigned facilities
- craft according to registered plans
- move items between their own inventory and storage when rules allow it
- continue routine work until player-defined targets are met

Villagers should be reliable workers, not autonomous strategists.

## What Should Not Be Fully Automated

Avoid automating these by default:

- creating new plans
- discovering the correct priority automatically
- switching production strategy without player input
- deciding stock targets on behalf of the player
- rebalancing the whole village optimally on its own

If the game handles these automatically, the player loses meaningful agency.

## Crisis And Expansion

The player should be most important during:

- shortages
- tool bottlenecks
- facility unlock timing
- sudden demand changes
- village growth decisions
- recovery after production stalls

Routine operation may be automated.
Non-routine adaptation should stay with the player.

## Practical Rule For New Features

When adding a feature, ask:

`Does this feature create a planning decision for the player, or does it remove one?`

Good additions usually increase:

- tradeoffs
- prioritization pressure
- planning clarity
- recovery decisions

Risky additions usually increase:

- passive waiting
- perfect automation
- hidden auto-optimization
- systems that solve problems before the player notices them

## Implementation Rules

Translate the design into code rules like this:

- villagers may execute registered plans, but should not invent plans
- stock targets should come from explicit player input
- facility recipes should be registered by the player
- facility staffing should be controlled by the player
- automation should stop at the boundary of strategic choice
- logs and UI should explain why work is or is not progressing

## Review Checklist

Use this when reviewing future changes:

- Does this change preserve the player as planner?
- Does this change preserve villagers as executors?
- Does this add a meaningful decision, or remove one?
- Would the village still need player intervention during shortages or expansion?
- Is the system automating execution, or automating strategy?
- If the feature is convenient, does it also erase tension?

## Current Project Policy

For this prototype, prefer the following interpretation:

- player-only: planning, registration, priorities, expansion, crisis response
- villager-only: repeated gathering and facility crafting
- shared storage: the player defines targets, villagers fulfill them

This policy should guide future UI and logic changes unless intentionally revised.
