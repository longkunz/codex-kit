# Workflow Refactor Analysis Plan — Revised

> Status: analysis and scope definition only. Implementation has not started.

## Scope and guardrails

- Remove the workflow layer only after equivalent skill routing exists.
- Do not broaden an existing skill merely to absorb a workflow.
- Split workflow requirements across multiple existing skills when responsibilities differ.
- Create a new skill only when no existing skill has the correct boundary.
- Protect user-owned files: never delete modified, unmanaged, or untracked workflows automatically.
- Do not change hooks, memories, profiles, plugin distribution, or unrelated CLI behavior.
- Keep the current `.agents/.shared/ui-ux-pro-max/` scripts and datasets in place during this milestone.

## Current inventory

### Workflows: 16

All are under `templates/project/.agents/workflows/`:

`brainstorm.md`, `check.md`, `create.md`, `debug.md`, `deploy.md`, `enhance.md`, `figma-to-code.md`, `orchestrate.md`, `plan.md`, `preview.md`, `review.md`, `ship.md`, `status.md`, `test.md`, `ui-ux-pro-max.md`, `verify.md`.

### Skill artifacts: 50

- 38 CLI catalog entries: `api-patterns`, `app-builder`, `architecture`, `bash-linux`, `brainstorming`, `code-review`, `database-design`, `debugging`, `doc`, `documentation`, `frontend-design`, `game-development`, `geo-fundamentals`, `i18n-localization`, `lint-and-validate`, `mcp-builder`, `mcp-onboarding`, `mobile-design`, `nextjs-react-expert`, `nodejs-best-practices`, `parallel-agents`, `performance-profiling`, `planning`, `powershell-windows`, `python-patterns`, `red-team-tactics`, `release-deployment`, `repo-onboarding`, `rust-pro`, `security-review`, `seo-fundamentals`, `server-management`, `tailwind-patterns`, `tdd-workflow`, `test-hardening`, `testing`, `webapp-testing`, `web-design-guidelines`.
- 11 nested skills: `app-builder/templates` and the ten `game-development/*` subskills.
- 1 plugin skill: `plugins/codex-kit/skills/codex-kit`.

`templates/project/.agents/skills/doc.md` remains a separate nonstandard catalog concern and is outside this workflow-refactor milestone.

## Revised decision matrix

| Workflow | Closest skill(s) | Overlap | Unique content | Action | Reason |
|---|---|---|---|---|---|
| `brainstorm.md` | `brainstorming` | high overlap | 2–4 concrete options, rough effort, explicit recommendation, next decision, no-code boundary | merge-into-existing-skill | These additions fit the existing ideation and ambiguity-reduction boundary. |
| `check.md` | `testing`; `lint-and-validate`; `webapp-testing` when browser behavior is involved; `AGENTS.md` for routing policy | partial overlap | Risk-scaled selection of checks, manual verification fallback, skipped checks, residual risk, escalation criteria | merge-into-existing-skill | Do not turn `lint-and-validate` into a general validation orchestrator. Split test execution, static validation, browser/manual verification, and routing policy by responsibility. |
| `create.md` | `app-builder` | high overlap | Repository inspection, incremental implementation, unrelated-file protection, validation handoff | merge-into-existing-skill | `app-builder/feature-building.md` already owns feature implementation, but its description and guardrails need targeted correction. |
| `debug.md` | `debugging` | exact duplicate | None after requirement-by-requirement coverage review | delete-duplicate | Every trigger, process, output, and boundary maps to the skill or its references. |
| `deploy.md` | `release-deployment` | high overlap | Named deploy modes and a concise execution-result output contract | merge-into-existing-skill | Core deployment behavior is covered, but these requirements are not explicit enough to justify direct deletion. |
| `enhance.md` | `app-builder` | high overlap | Preserve conventions, architecture/scope confirmation boundary, risk-scaled validation | merge-into-existing-skill | These fit the existing feature-building responsibility without turning `app-builder` into a generic coding skill. |
| `figma-to-code.md` | `frontend-design` + `webapp-testing` | partial overlap | Figma node/frame acquisition, metadata fallback, exact screenshot reference, repository token reuse, fidelity comparison | convert-to-new-skill | No existing skill owns the end-to-end Figma-to-production-code procedure. |
| `orchestrate.md` | `parallel-agents` | high overlap | Main-thread critical-path ownership, same-write-set prohibition, immediate-blocker delegation guardrail | merge-into-existing-skill | The skill owns orchestration, but the workflow contains concrete safety rules not stated explicitly. |
| `plan.md` | `planning` | high overlap | Mandatory repository inspection and current-state summary in the output | merge-into-existing-skill | The plan structure is covered, but repository grounding is currently implied rather than explicit. |
| `preview.md` | No matching skill | no matching skill | Local preview command discovery, process lifecycle, port conflicts, local URL and health reporting | convert-to-new-skill | `server-management` is production-operations guidance. Expanding it to local development would blur its boundary. Proposed skill: `local-preview`. |
| `review.md` | `code-review` | exact duplicate | None after requirement-by-requirement coverage review | delete-duplicate | Every review requirement maps directly to the skill or its two references. |
| `ship.md` | `release-deployment` | high overlap | High-signal merge/release handoff output | merge-into-existing-skill | Handoff is adjacent to release responsibility and can be added as a small reference. |
| `status.md` | No matching skill | no matching skill | Current workstream, changed areas, validation/preview/deployment state, blockers, next action | convert-to-new-skill | `repo-onboarding` maps unfamiliar repositories; it should not become an active-work status reporter. Proposed skill: `repo-status`. |
| `test.md` | `testing` | high overlap | Framework/convention inspection, targeted execution, command/result reporting, ambiguous-behavior boundary | merge-into-existing-skill | These are operational testing requirements within the existing testing boundary. |
| `ui-ux-pro-max.md` | `frontend-design` | high overlap | Search commands, design-system persistence, and routing to the existing shared engine/data | merge-into-existing-skill | `frontend-design` may reference `.agents/.shared/ui-ux-pro-max/` in this milestone. Resource relocation is explicitly deferred. |
| `verify.md` | `release-deployment` + `test-hardening` + `documentation` | high overlap | Cross-skill escalation policy, background-job/external-integration checks, unified unverified-risk output | merge-into-existing-skill | Split proof strength, release readiness, and documentation by responsibility; keep orchestration policy in `AGENTS.md`. |

### Revised totals

- 2 `delete-duplicate`
- 11 `merge-into-existing-skill`
- 3 `convert-to-new-skill`
- 0 `move-to-docs`
- 0 `remove-obsolete`

## Exact-duplicate coverage maps

The six workflows previously labeled exact duplicate are mapped below. Only `debug.md` and `review.md` remain `delete-duplicate`; the other four are downgraded because at least one requirement is not explicit in the target skill.

### `debug.md` → `debugging` — proven exact duplicate

| Workflow requirement | Covered by | Coverage result |
|---|---|---|
| Trigger: failures, regressions, unclear runtime behavior | `debugging/SKILL.md` frontmatter description | Exact trigger coverage: bug, regression, failure, flaky behavior, unexpected output, unclear runtime behavior. |
| Reproduce or state why reproduction is blocked | `debugging/SKILL.md` → Requirements → **Reproduce**; `references/systematic-process.md` → Phase 1 | Requires the smallest repeatable path and reproduction evidence. A blocked reproduction is naturally reported by the deliverable evidence gap. |
| Capture logs, errors, failing tests, inputs/environment, expected vs actual | `references/debugging-checklist.md` → During Investigation; Before Starting; Deliverable Standard | Covers logs, traces, tests, call paths, expected behavior, reproduction and evidence collection. |
| Identify the failure boundary | `debugging/SKILL.md` → Requirements → **Narrow scope**; `references/systematic-process.md` → Phase 2 | Explicitly identifies the boundary where correct behavior becomes incorrect. |
| Form and test ranked hypotheses | `debugging/SKILL.md` → **Hypothesis & Root cause**; `references/systematic-process.md` → Phases 2–3 | Requires falsifiable hypotheses and cause isolation rather than guessing. |
| Confirm root cause before fixing | `debugging/SKILL.md` opening contract and **Minimal fix** | Explicitly says identify the concrete cause before choosing the fix. |
| Apply the smallest defensible fix | `debugging/SKILL.md` → **Minimal fix**; `references/debugging-checklist.md` → Fix and Verification | Exact coverage. |
| Add/update regression tests and rerun reproduction | `debugging/SKILL.md` → **Regression verification**; both references → Fix & Verify | Exact coverage. |
| Output: symptom, evidence, hypotheses, root cause, fix, prevention/follow-up | `references/debugging-checklist.md` → Deliverable Standard plus `debugging/SKILL.md` requirements | Reproduction/expected-vs-actual supplies symptom; evidence, root cause, fix strategy and regression plan supply the remaining fields. |
| Boundary: no guess-and-patch or speculative rewrite | `debugging/SKILL.md` opening contract; `references/systematic-process.md` → Anti-Patterns | Exact coverage. |

Conclusion: no unique requirement remains. Keep `delete-duplicate`.

### `review.md` → `code-review` — proven exact duplicate

| Workflow requirement | Covered by | Coverage result |
|---|---|---|
| Trigger: patch, branch, implementation/design review | `code-review/SKILL.md` frontmatter | Patch, branch and implementation review are explicit; design risk is covered through behavior and boundary review. |
| Map affected code paths first | `references/checklist.md` → Correctness & Regressions | Requires following call sites, contracts, migrations and adjacent behavior. |
| Review correctness | `code-review/SKILL.md` → **Focus on behavior**; `references/checklist.md` | Exact coverage. |
| Review security | `code-review/SKILL.md` → **Review security**; `references/checklist.md` → Security & Safety | Exact coverage. |
| Review regression risk | `code-review/SKILL.md` → **Hunt for regressions** | Exact coverage. |
| Review missing/weak tests | `code-review/SKILL.md` → **Review tests**; `references/checklist.md` → Missing Validation & Tests | Exact coverage. |
| Review rollout/migration risk where relevant | `references/checklist.md` → existing contracts, migrations, irreversible actions and rollback paths | Covers the concrete release-risk surfaces required by the workflow. |
| Findings before style comments | `code-review/SKILL.md` opening contract | Explicitly prioritizes risk over “style theater.” |
| Cite file/location and reproduction scenario | `references/high-signal-output.md` → Finding Standard | Requires what, why, where, and triggering scenario. |
| Order findings by severity | `references/high-signal-output.md` → Severity Guidance and Output Shape | Exact coverage. |
| If no findings, state residual risk/testing gaps | `code-review/SKILL.md` final paragraph; `references/high-signal-output.md` | Exact coverage. |
| Define unclear review scope before proceeding | `code-review/SKILL.md` frontmatter and finding contract | The review target must be a patch/branch/implementation; limited scope/context must be reported as residual uncertainty. |

Conclusion: no unique requirement remains. Keep `delete-duplicate`. The stale `code-review/verify.md` link disappears with the workflow.

### `deploy.md` → `release-deployment` — downgraded to high overlap

| Workflow requirement | Covered by | Gap/decision |
|---|---|---|
| Confirm target environment and platform | `references/readiness-checklist.md` → Environment; `references/deployment-process.md` → Identify release surface | Environment is covered; platform identification is only implicit. Add a concise target/platform field. |
| Run validation appropriate to release risk | `release-deployment/SKILL.md` → Pre-flight readiness | Covered. |
| Check env vars, secrets and config | `references/readiness-checklist.md` → Environment | Covered. |
| Build/package via the project’s real deployment path | `references/deployment-process.md` → PREPARE/DEPLOY | Covered, but command/result reporting is not explicit. |
| Execute deploy, then smoke and health checks | `references/deployment-process.md` → DEPLOY/VERIFY; `release-deployment/SKILL.md` → Verification | Covered. |
| Record version, URL and rollback path | Rollback path is covered by `references/rollback.md`; version and URL are not explicit | Unique output fields must be merged. |
| Modes: check, preview/stage, production, rollback | References cover readiness, deploy and rollback | Named mode selection is not explicit; add it without changing the deployment boundary. |
| Output: environment, command/pipeline, result, smoke result, rollback note | Distributed across references | The unified output contract is unique. |

Conclusion: change action to `merge-into-existing-skill`; add only modes and output contract to `release-deployment`.

### `orchestrate.md` → `parallel-agents` — downgraded to high overlap

| Workflow requirement | Covered by | Gap/decision |
|---|---|---|
| Trigger only when independent workstreams benefit from delegation | `parallel-agents/SKILL.md` frontmatter and When to Use Orchestration | Covered. |
| Main agent owns the immediate critical path | Best Practices → logical order; orchestration patterns | Not explicit. Add main-thread critical-path ownership. |
| Identify sidecars that can run in parallel | Orchestration Patterns | Covered. |
| Give each agent narrow responsibility and bounded write scope | Best Practices → orchestrate only material roles; share context | Narrow responsibility is covered; write-scope collision is not explicit. |
| Pass request, relevant files, decisions and expected output | Native Agent Invocation → With Context Passing; Best Practices → Share context | Covered. |
| Continue non-overlapping local work | Parallel patterns | Implied, but same-write-set prohibition is absent. |
| Integrate results and run final validation | Synthesis Protocol; Best Practices → Verify changes | Covered. |
| Do not delegate an immediate blocker | Not explicit | Unique guardrail. |
| Do not parallel-edit the same write set | Not explicit | Unique guardrail. |
| Do not spawn merely because the task is large | When to Use → not for simple/single-domain work | Partially covered; retain the sharper rule. |

Conclusion: change action to `merge-into-existing-skill`; add three bounded safety rules to `parallel-agents/SKILL.md`.

### `plan.md` → `planning` — downgraded to high overlap

| Workflow requirement | Covered by | Gap/decision |
|---|---|---|
| Inspect current code/repository layout first | `references/implementation-plan.md` → project-specific validation and completion bar | Repository grounding is implied, not required explicitly. Add a repository-inspection requirement. |
| Define target behavior and non-goals | `planning/SKILL.md` → Scope & Non-goals; reference → Goal/Scope | Covered. |
| Capture dependencies and constraints | `planning/SKILL.md` → Dependencies; reference → Assumptions/Dependencies | Covered. |
| Sequence implementation steps | `planning/SKILL.md` → Task breakdown; reference → Sequence | Covered. |
| Capture API, data, migration and config changes | Reference → specific paths, dependencies, risks | These surfaces are not enumerated explicitly. Add them to the planning checklist when relevant. |
| Call out risky assumptions and open questions | Reference → Assumptions, Risks, Open questions | Covered. |
| Define validation and acceptance criteria | Skill requirements and reference | Covered. |
| Output includes current-state summary | Existing plan template lacks a current-state field | Unique output requirement. |

Conclusion: change action to `merge-into-existing-skill`; add repository grounding and current-state summary without rewriting the plan format.

### `verify.md` → multiple skills — downgraded to high overlap

| Workflow requirement | Covered by | Gap/decision |
|---|---|---|
| Trigger for release-sensitive/cross-cutting changes | `release-deployment/SKILL.md` frontmatter | Covered for rollout, migrations and operational stability; cross-cutting non-release policy belongs in `AGENTS.md`. |
| Run broader automated coverage than routine checks | `test-hardening/SKILL.md` → Focus Areas/Workflow | Covered by proof-strength responsibility. |
| Review config, migrations and compatibility | `release-deployment/SKILL.md`; readiness/deployment references | Covered. |
| Verify deploy and rollback assumptions | `release-deployment/SKILL.md`; rollback reference | Covered. |
| Check secrets | readiness checklist → Environment | Covered. |
| Check background jobs and external integrations | Not explicit in the closest skills | Add these release-surface checks to `release-deployment/references/readiness-checklist.md`. |
| Check schema compatibility | deployment process → backward/forward compatibility | Covered. |
| Include accurate operational documentation | `documentation/SKILL.md` | Covered as a separate responsibility. |
| Output broader validation, blockers/warnings and anything unverified | Distributed across skills, but unified reporting policy is absent | Put cross-skill output policy in `AGENTS.md`, not inside one skill. |

Conclusion: change action to `merge-into-existing-skill`, distributed across `release-deployment`, `test-hardening`, `documentation`, and routing policy in `AGENTS.md`.

## Ambiguous mapping review

### `check.md`

Do not broaden `lint-and-validate` into a general quality gate.

| Requirement | Destination | Planned treatment |
|---|---|---|
| Run the smallest relevant automated test scope | `testing/SKILL.md` | Add targeted test execution and reporting. |
| Run lint/typecheck only when it adds signal | `lint-and-validate/SKILL.md` | Replace unconditional “after every change” language with scope-aware static validation inside its existing boundary. |
| Verify changed behavior manually when automation is absent | `webapp-testing` for browser-visible behavior; otherwise `AGENTS.md` validation policy | Do not force generic manual verification into a static-analysis skill. |
| Record commands, results, skipped checks and residual risk | `AGENTS.md` result-delivery/validation policy; test command details in `testing` | Cross-skill reporting belongs in repository operating guidance. |
| Escalate for config, infra, migrations, cross-system or release risk | `AGENTS.md` routing to `release-deployment` and `test-hardening` | Routing policy, not domain knowledge. |

Action remains `merge-into-existing-skill`, but the merge is intentionally distributed.

### `preview.md`

`server-management` covers production process management, monitoring and scaling. Local development command discovery, transient dev-server lifecycle and developer-facing URLs are a different boundary.

Create `local-preview`:

```text
local-preview/
├── SKILL.md
└── agents/
    └── openai.yaml
```

Proposed description:

> Start, stop, restart, discover, and health-check local application preview or development servers. Use when Codex needs to find the repository’s real preview command, resolve a local port conflict, report a working localhost URL, or verify that a changed route renders locally.

No references or scripts are needed initially; the workflow is short and repository-dependent.

### `status.md`

`repo-onboarding` is for first-pass mapping of an unfamiliar repository. Active-work reporting is not onboarding and should not alter that skill’s trigger.

Create `repo-status`:

```text
repo-status/
├── SKILL.md
└── agents/
    └── openai.yaml
```

Proposed description:

> Summarize the current repository or task state from real workspace evidence. Use when the user asks for status, progress, changed areas, validation state, preview or deployment state, blockers, or the next practical action without requesting implementation.

No references or scripts are needed initially.

## UI/UX scope decision

This milestone does not move or rewrite any file under `.agents/.shared/ui-ux-pro-max/`.

Current-milestone behavior:

1. Add a targeted section to `frontend-design/SKILL.md` describing when to use the existing shared search engine.
2. Reference `.agents/.shared/ui-ux-pro-max/scripts/search.py` and its current data location directly.
3. Update routing from `ui-ux-pro-max.md` to `frontend-design`.
4. Delete the workflow only after routing and documentation are updated.
5. Keep all three scripts and all 24 CSV datasets at their current paths.

Follow-up outside this milestone:

- Evaluate whether the shared package should become bundled `frontend-design` resources.
- Design a separate ownership-aware resource-path migration.
- Update script path resolution and compatibility only in that follow-up.

## Migration requirements

The migration must use both manifest ownership and current content hashes.

1. Delete a retired workflow only when it is tracked as `managed`, has an `installedHash`, and its current hash equals that `installedHash`.
2. Preserve a managed workflow when its current hash differs from `installedHash`.
3. Preserve every `unmanaged` workflow.
4. Preserve every untracked workflow, including files added by the user under `.agents/workflows/`.
5. Never recursively delete `.agents/workflows/` as part of retirement.
6. After individual managed files are retired, inspect the directory and remove it only when it is truly empty.
7. If any user file remains, keep `.agents/workflows/` and report which retired/user files were preserved.
8. Remove manifest entries for managed-unchanged workflows that were deleted.
9. Preserve manifest ownership/baselines for modified or unmanaged files; do not silently rebaseline them.
10. A second `update` run must be idempotent: no additional deletion, warning churn, duplicate manifest mutation or failure.
11. Normalize manifest and candidate paths so both `/` and Windows `\` separators match the same retired workflow.
12. `--force` must not delete locally modified, unmanaged or untracked workflows. Force is not migration ownership.
13. Fresh initialization must never create the retired workflow files.
14. Dry-run must report planned deletion/preservation without changing files or manifest state.

## Required migration tests

| Test | Expected result |
|---|---|
| Managed workflow exists and current hash equals `installedHash` | File deleted; manifest entry removed. |
| Managed workflow content differs from `installedHash` | File preserved; manifest baseline preserved; warning emitted. |
| Workflow manifest entry is `unmanaged` | File preserved; entry remains unmanaged. |
| Workflow exists with no manifest entry | File preserved and not adopted. |
| Retired managed files are deleted and directory becomes empty | `.agents/workflows/` directory removed. |
| A user workflow remains after managed files are deleted | Directory remains; user file remains byte-identical. |
| Manifest contains mixed `/` and `\` path separators | Matching and cleanup behave identically. |
| `update` is run twice | Second run succeeds and produces no further filesystem/manifest changes. |
| `update --force` with a locally modified workflow | Modified workflow remains byte-identical. |
| Dry-run with deletable and preserved workflows | Correct plan reported; filesystem and manifest unchanged. |
| Fresh init after template retirement | No `.agents/workflows` directory is created unless another user/template file requires it. |

## Revised file-change table

| Change type | File | Exact change | Reason |
|---|---|---|---|
| Modify | `src/lib/kit.js` | Add hash- and ownership-aware workflow retirement, empty-directory cleanup, path normalization, dry-run reporting, manifest cleanup and idempotent behavior | Migration foundation |
| Modify | `test/p0.test.js` | Add all migration tests listed above, including Windows separators and `--force` preservation | Prove user-file safety |
| Modify | `test/skill-catalog.test.js` | Remove the 16-workflow invariant; validate the three new skills and absence of shipped workflow files | Update catalog invariants |
| Modify | `templates/project/.agents/skills/brainstorming/SKILL.md` | Add option comparison, recommendation, next-decision and no-code output contract | Merge `brainstorm.md` |
| Modify | `templates/project/.agents/skills/testing/SKILL.md` | Add framework discovery, targeted execution and command/result reporting | Merge `test.md` and the testing part of `check.md` |
| Modify | `templates/project/.agents/skills/lint-and-validate/SKILL.md` | Make static checks scope-aware while retaining lint/type/static-analysis boundary | Merge only the static-validation part of `check.md` |
| Modify | `templates/project/.agents/skills/release-deployment/SKILL.md` | Add deploy modes, target/platform confirmation, execution output contract and handoff reference | Merge `deploy.md` and `ship.md` |
| Modify | `templates/project/.agents/skills/release-deployment/references/readiness-checklist.md` | Add background-job and external-integration release-surface checks | Merge part of `verify.md` |
| Create | `templates/project/.agents/skills/release-deployment/references/release-handoff.md` | Add change, validation, operator-note and follow-up output contract | Preserve unique `ship.md` content |
| Modify | `templates/project/.agents/skills/parallel-agents/SKILL.md` | Add critical-path ownership, immediate-blocker and same-write-set guardrails | Merge `orchestrate.md` |
| Modify | `templates/project/.agents/skills/planning/SKILL.md` | Require repository inspection and a current-state summary | Merge `plan.md` |
| Modify | `templates/project/.agents/skills/planning/references/implementation-plan.md` | Enumerate API/data/migration/config surfaces when relevant | Preserve explicit planning coverage |
| Modify | `templates/project/.agents/skills/app-builder/SKILL.md` | Correct trigger metadata for new apps and feature work without making it a generic coding skill | Prepare `create`/`enhance` merge |
| Modify | `templates/project/.agents/skills/app-builder/feature-building.md` | Add incremental implementation, convention preservation, scope boundary and validation handoff | Merge `create.md` and `enhance.md` |
| Modify | `templates/project/.agents/skills/frontend-design/SKILL.md` | Reference the current `.agents/.shared/ui-ux-pro-max/` search entrypoint and commands | Retire UI/UX workflow without resource relocation |
| Create | `templates/project/.agents/skills/figma-to-code/SKILL.md` | Add Figma acquisition, implementation and fidelity-verification procedure | Convert `figma-to-code.md` |
| Create | `templates/project/.agents/skills/figma-to-code/agents/openai.yaml` | Add UI metadata/default prompt | Standard skill metadata |
| Create | `templates/project/.agents/skills/figma-to-code/references/fidelity-checklist.md` | Add responsive, state, visual and accessibility comparison checklist | Progressive disclosure |
| Create | `templates/project/.agents/skills/local-preview/SKILL.md` | Add local preview lifecycle, port and URL/health reporting procedure | Convert `preview.md` without broadening `server-management` |
| Create | `templates/project/.agents/skills/local-preview/agents/openai.yaml` | Add UI metadata/default prompt | Standard skill metadata |
| Create | `templates/project/.agents/skills/repo-status/SKILL.md` | Add evidence-based current repository/task status reporting | Convert `status.md` without broadening `repo-onboarding` |
| Create | `templates/project/.agents/skills/repo-status/agents/openai.yaml` | Add UI metadata/default prompt | Standard skill metadata |
| Modify | `src/lib/skills.js` | Add `figma-to-code`, `local-preview`, and `repo-status` to the canonical catalog with appropriate tiers/categories; do not change existing profile definitions in this milestone | Skill discovery without unrelated profile changes |
| Modify | `templates/project/.agents/skills/mcp-onboarding/SKILL.md` | Replace workflow pairings with direct skill pairings | Remove stale workflow references |
| Modify | `templates/project/.agents/skills/repo-onboarding/SKILL.md` | Remove workflow pairings only; do not expand its onboarding boundary | Remove stale workflow references |
| Modify | `templates/project/.agents/skills/test-hardening/SKILL.md` | Replace workflow pairings with direct `testing`/`release-deployment` guidance | Remove stale workflow references |
| Modify | `templates/project/AGENTS.md` | Route directly to skills/subagents; hold cross-skill check/verify escalation and result-reporting policy | Replace workflow orchestration responsibly |
| Modify | `templates/project/AGENT_FLOW.md` | Rewrite human documentation from workflow selection to skill selection | Human-readable routing docs |
| Modify | `templates/project/ARCHITECTURE.md` | Remove workflow layer while retaining `.agents/.shared/ui-ux-pro-max/` as an existing shared resource package | Accurate architecture for this milestone |
| Modify | `README.md` | Remove workflow count/path and update skill catalog/product wording | Public docs |
| Modify | `README-vi.md` | Mirror README changes | Public docs |
| Modify | `plugins/codex-kit/skills/codex-kit/SKILL.md` | Remove local workflow resolution/aliases; route to shipped skills | Plugin consistency |
| Modify | `plugins/codex-kit/.codex-plugin/plugin.json` | Remove workflow capability/default prompt wording | Plugin manifest consistency |
| Modify | `package.json` | Remove workflow-specific package description/keyword | Package metadata |
| Modify | `web/src/content.ts` | Replace workflow catalog/guides with skill routing and migration explanation | Web docs |
| Modify | `web/src/components/LandingPage.tsx` | Remove workflow metric/marketing copy | Public messaging |
| Modify | `web/src/components/DocsFooter.tsx` | Replace Workflows link | Avoid dead route |
| Modify | `web/src/seo.ts` | Update workflow-specific SEO wording | Public messaging |
| Modify | `web/index.html` | Update workflow-specific static metadata | Public messaging |
| Delete | `templates/project/.agents/workflows/brainstorm.md` | Delete after merge | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/check.md` | Delete after distributed merge/routing | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/create.md` | Delete after app-builder merge | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/debug.md` | Delete proven duplicate | Covered by `debugging` |
| Delete | `templates/project/.agents/workflows/deploy.md` | Delete after release-deployment merge | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/enhance.md` | Delete after app-builder merge | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/figma-to-code.md` | Delete after skill conversion | Replaced by standard skill |
| Delete | `templates/project/.agents/workflows/orchestrate.md` | Delete after parallel-agents guardrail merge | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/plan.md` | Delete after planning merge | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/preview.md` | Delete after `local-preview` conversion | Replaced by standard skill |
| Delete | `templates/project/.agents/workflows/review.md` | Delete proven duplicate | Covered by `code-review` |
| Delete | `templates/project/.agents/workflows/ship.md` | Delete after release handoff merge | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/status.md` | Delete after `repo-status` conversion | Replaced by standard skill |
| Delete | `templates/project/.agents/workflows/test.md` | Delete after testing merge | Retire workflow layer |
| Delete | `templates/project/.agents/workflows/ui-ux-pro-max.md` | Delete after frontend-design routing changes | Shared resources remain in place |
| Delete | `templates/project/.agents/workflows/verify.md` | Delete after distributed merge/routing | Retire workflow layer |

Explicitly out of scope: moving, renaming or editing any file under `templates/project/.agents/.shared/ui-ux-pro-max/`.

## Revised implementation batches

### Batch 1 — Migration foundation

- Implement ownership/hash checks, path normalization, dry-run behavior, manifest cleanup and empty-directory cleanup.
- Add tests for managed unchanged, managed modified, unmanaged, untracked, user files, idempotency, Windows separators and `--force`.
- Keep all workflows in the template until this batch is proven.

### Batch 2 — Proven exact duplicates

- Retire only `debug.md` and `review.md`.
- Remove their stale references.
- Confirm no requirement from either workflow is lost.

### Batch 3 — Low-risk merges

- Merge and retire `brainstorm.md`, `test.md`, `deploy.md`, `ship.md`, `orchestrate.md`, `plan.md`, and `verify.md`.
- Keep changes targeted to the sections/files named in this plan.

### Batch 4 — Ambiguous mapping review

- Implement the distributed `check.md` mapping across `testing`, `lint-and-validate`, optional `webapp-testing`, and `AGENTS.md` policy.
- Create and validate `local-preview`; then retire `preview.md`.
- Create and validate `repo-status`; then retire `status.md`.
- Review trigger descriptions to confirm no existing skill boundary was broadened.

### Batch 5 — App-builder merges

- Merge `create.md` and `enhance.md` into `app-builder` and `feature-building.md`.
- Preserve the distinction between app/feature building and generic coding assistance.
- Retire both workflows.

### Batch 6 — Figma-to-code conversion

- Create `figma-to-code` with its metadata and fidelity reference.
- Validate the new skill and catalog entry.
- Retire `figma-to-code.md` only after validation succeeds.

### Batch 7 — UI/UX workflow retirement without resource relocation

- Add current-location shared-resource guidance to `frontend-design`.
- Update routing away from `ui-ux-pro-max.md`.
- Verify the existing search entrypoint still works from `.agents/.shared/ui-ux-pro-max/`.
- Retire only the workflow; do not move scripts or CSV files.
- Record resource relocation as a separate future milestone.

### Batch 8 — Final routing/docs cleanup

- Update AGENTS, AGENT_FLOW, ARCHITECTURE, READMEs, plugin metadata, package metadata and web docs.
- Remove all remaining shipped workflow references.
- Run catalog, CLI migration and documentation checks.
- Run update twice to confirm idempotency.
- Confirm user-owned workflow files survive and `.agents/workflows/` is removed only when empty.

## Approval gate

Do not begin implementation until this revised scope is reviewed and explicitly approved.
