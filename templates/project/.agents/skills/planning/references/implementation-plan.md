# Implementation Plan Guidelines

## Overview

Turn ambiguous work into a plan another agent can execute without reopening core decisions. Resolve scope, sequence, constraints, and definition of done before treating the plan as complete.

## Output Standard

Produce plans that answer all of these points:
1. **Goal**: what will be true when the task is done.
2. **Scope**: what is included and what is explicitly excluded (non-goals).
3. **Assumptions**: facts treated as true until disproved.
4. **Dependencies**: tools, services, approvals, inputs, or files required.
5. **Sequence (Task Breakdown)**: the ordered work with critical-path awareness.
6. **Acceptance Criteria**: observable checks for completion.
7. **Risks**: likely failure modes and how to handle them.
8. **Validation Plan**: how to verify the work (Verification is always LAST).
9. **Open questions**: only if they block a safe decision.

## Task Breakdown Principles

1. **Keep it Short**: 5-10 clear tasks max. If a plan is longer than 1 page, simplify it.
2. **Be Specific**: Give exact commands or file paths (e.g., "Run `npx create-next-app`" instead of "Set up project").
3. **Small, Focused Tasks**: Each task should have one clear outcome and be independently verifiable.
4. **Logical Ordering**: Put irreversible or high-blast-radius work after validation where possible. Move expensive steps later if cheaper checks can fail first.
5. **Project-Specific Validation**: Do not copy-paste generic validation scripts. Use what is relevant for the tech stack.

## Plan Structure Template

Use the lightest structure that still removes ambiguity.

```markdown
# [Task Name]

## Goal & Scope
One sentence: What are we building/fixing? What are the non-goals?

## Risks & Dependencies
- Risk 1 -> Mitigation
- Dependency 1 -> State

## Tasks
- [ ] Task 1: [Specific action] -> Verify: [How to check]
- [ ] Task 2: [Specific action] -> Verify: [How to check]
- [ ] Task 3: [Specific action] -> Verify: [How to check]

## Done When (Acceptance Criteria)
- [ ] [Main success criteria]
```

## Completion Bar
A plan is decision-complete when a competent implementer can start work without asking what to do first, what success looks like, what assumptions are in force, which risks need active handling, or whether major decisions are still pending.
