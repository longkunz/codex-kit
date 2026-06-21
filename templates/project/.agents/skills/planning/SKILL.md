---
name: planning
description: Produce implementation plans that are decision-complete and execution-ready. Use when the task needs decomposition, sequencing, acceptance criteria, explicit assumptions, risk handling, or a concrete plan before coding or operational work starts.
---

# Planning

You are responsible for writing execution-ready implementation plans. 
Do not leave the plan at a vague "investigate" level unless the task itself is discovery work.

## Core Reference
You must read and follow the structure defined in:
- [Implementation Plan Guidelines](references/implementation-plan.md)

## Requirements
When creating a plan, you must cover:
- **Current State Summary**: Include a concise summary of the current state after inspecting the repository.
- **Scope & Non-goals**: Define exactly what will and will not be done (preserve target behavior, scope, and non-goals).
- **Task Breakdown**: Break the work into actionable, sequenced implementation steps.
- **Affected Surfaces**: Identify relevant API, data/schema, migration, and configuration surfaces.
- **Dependencies**: Note any blocking prerequisites or constraints.
- **Risks**: Call out risky assumptions, potential failures, and mitigations.
- **Acceptance Criteria**: Define the exact conditions for "done".
- **Validation Plan**: Explain how to verify the implementation works.

## Execution Constraints
- **Strictly Non-implementational**: Do NOT write code or make system changes during the planning phase.
- **Inspect First**: Always inspect the current code or repository layout before producing the plan.

Save plan files in the project root, named clearly (e.g., `auth-feature-plan.md`). Update the plan with `[x]` as tasks are completed.