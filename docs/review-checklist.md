# Review Checklist

## Purpose

Use this checklist during code review for gameplay, UI, and automation changes.

It is intentionally short and practical.

## Core Question

Before reviewing details, ask:

`Does this change preserve the player as planner and villagers as executors?`

If the answer is unclear, stop there first.

## Game Design

- Does this change add a meaningful player decision?
- Does this change remove an existing player decision?
- Is the system automating execution rather than strategy?
- Will the player still need to intervene during shortages, bottlenecks, or expansion?
- Does this feature create planning tension, or only passive waiting?

## UI

- Can the player see what is registered, assigned, and targeted?
- Can the player easily add, remove, or revise a plan?
- Is it obvious why a task is blocked?
- Are important blocked states visible without reading logs only?
- Is any strategic behavior hidden behind the UI?
- Does the UI support decision-making more than passive observation?

## Automation

- Are villagers only executing player-defined plans?
- Can villagers continue routine work without inventing new work?
- Does any automation silently reprioritize production?
- Does any automation silently reassign workers?
- Does any automation silently change targets or plans?

## Logic

- Is gameplay logic staying outside Vue components where practical?
- Are state transitions understandable and explicit?
- Are item transfers explicit?
- Can you explain why a task starts, continues, stops, or fails to restart?
- Are time, queues, and automation rules still understandable after this change?

## Storage And Inventory

- Is it clear whether an item is in storage or in a villager inventory?
- Are tool requirements checked in the correct place?
- Are crafting inputs consumed from the correct inventory?
- Are gathered or crafted outputs deposited to the correct place?

## Facilities And Work Plans

- Are facility assignments explicit and editable by the player?
- Are craft registrations explicit and editable by the player?
- Are stock targets explicit and editable by the player?
- Does the facility work only when assignment, registration, and stock conditions are satisfied?

## Risk Flags

Pay extra attention if the change includes any of these:

- full automation
- hidden auto-optimization
- automatic reprioritization
- automatic worker reassignment
- automatic plan creation
- automatic correction of player intent

These are not always wrong, but they are high-risk for this project direction.

## Final Pass

Before approving, answer these:

- What decision is the player making because of this feature?
- What work are villagers doing because of this feature?
- What would break or become less interesting if this were more automated?

If those answers are weak, the change may need redesign rather than polish.
