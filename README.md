# Codex Kit

[![npm version](https://img.shields.io/npm/v/@longkunz/codex-kit.svg)](https://www.npmjs.com/package/@longkunz/codex-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Read this in other languages: [English](README.md), [Tiếng Việt](README-vi.md)*

> Codex-native starter kit with scaffolded docs, skills, workflows, agents, plugin support, and local skill management.

Codex Kit helps you bootstrap a repository that already knows how to work with Codex.

Instead of rebuilding the same operating layer in every project, you get a ready-to-use scaffold with routing docs, a shipped skill catalog, workflow playbooks, focused subagents, Codex config, and update/status commands.

## Quick Install

```bash
npx @longkunz/codex-kit init
```

Or install globally:

```bash
npm install -g @longkunz/codex-kit
codex-kit init
```

Initialize into a specific directory:

```bash
npx @longkunz/codex-kit init --path ./my-project
```

## What You Get

- root routing docs: `AGENTS.md`, `ARCHITECTURE.md`, `AGENT_FLOW.md`
- a catalog of 38 shipped skills (17 core + 21 optional), with 17 core skills installed by default
- 16 workflow playbooks in `.agents/workflows`
- 16 focused subagents in `.codex/agents`
- shared UI/UX data and scripts in `.agents/.shared`
- project-scoped Codex config in `.codex/config.toml`
- Codex execution rules in `.codex/rules/default.rules`
- optional project hooks in `.codex/hooks.json` and `.codex/hooks/`
- managed-file tracking in `.codex-kit/manifest.json`

## Command Quick Reference

| Group | Command | Description |
|---|---|---|
| Setup | `codex-kit init` | Initialize a project with the 17 core skills. |
| Setup | `codex-kit init --profile <name>` | Initialize core skills plus the selected optional profile. |
| Setup | `codex-kit init --include-plugin` | Initialize and include the workspace plugin. |
| Setup | `codex-kit init --include-hooks` | Initialize and include project hooks. |
| Setup | `codex-kit init --all` | Initialize with plugin and hooks. |
| Setup | `codex-kit setup-codex` | Set up the scaffold, workspace plugin, and core project skills. |
| Setup | `codex-kit setup-codex --enable-memories` | Full local setup with user-local memories enabled. |
| Skills | `codex-kit install skill <name>` | Install one canonical skill by name. |
| Skills | `codex-kit install --target skills` | Install the 17 core skills into the current project. |
| Skills | `codex-kit install --target skills --profile <name>` | Install core + profile-specific skills. |
| Skills | `codex-kit autoskills` | Detect the project stack and install matching catalog skills. |
| Skills | `codex-kit autoskills --dry-run` | Preview detected technologies and matching skills without writing files. |
| Skills | `codex-kit sync --target skills` | Sync the canonical skills currently installed in the project. |
| Discovery | `codex-kit list --target skills` | List shipped skills with tier and profile metadata. |
| Discovery | `codex-kit list --target skills --query <text>` | Search the shipped skill catalog. |
| Discovery | `codex-kit list --target plugin` | Show workspace plugin status. |
| Discovery | `codex-kit list --target mcp` | Show MCP bundle status. |
| Discovery | `codex-kit list --target memories` | Show local memories status. |
| Discovery | `codex-kit status` | Show scaffold-managed file status. |
| Maintenance | `codex-kit update` | Refresh scaffold-managed files. |
| Maintenance | `codex-kit sync-codex` | Sync scaffold + plugin + project skills after upgrading. |
| Maintenance | `codex-kit sync --target plugin` | Sync the workspace plugin. |
| Maintenance | `codex-kit sync --target mcp` | Sync the MCP bundle in project config. |
| Maintenance | `codex-kit sync --target hooks` | Sync project hooks. |
| Components | `codex-kit install --target plugin` | Install only the workspace plugin. |
| Components | `codex-kit install --target mcp` | Install MCP bundle into project config. |
| Components | `codex-kit install --target mcp --scope local` | Install MCP bundle into user-local Codex config. |
| Components | `codex-kit install --target hooks` | Install project hooks. |
| Components | `codex-kit install --target memories --scope local` | Enable user-local Codex memories. |
| Diagnostics | `codex-kit doctor` | Validate Codex Kit project health. |
| Diagnostics | `codex-kit doctor --fix` | Apply safe repairs. |
| Diagnostics | `codex-kit doctor --json` | Print machine-readable validation results. |
| Diagnostics | `codex-kit doctor --strict` | Treat warnings as failures. |

> See the [Command Quick Reference](#command-quick-reference) for the full list. For detailed options run `codex-kit --help`.

## Codex Integration

Codex Kit ships with a local Codex plugin scaffold:

- plugin manifest: `plugins/codex-kit/.codex-plugin/plugin.json`
- plugin skill: `plugins/codex-kit/skills/codex-kit/SKILL.md`
- local marketplace support via `.agents/plugins/marketplace.json`

There are two different installation scopes:

- project-local: `init` or plain `install` installs the scaffold without the optional plugin; `init --include-plugin` adds the workspace plugin, and `init --all` adds the plugin plus project hooks
- focused project-local installs: `install --target plugin` or `install --target skills` add only those parts into the current repository
- project-local hooks: `install --target hooks` writes `.codex/hooks.json` and safe local hook scripts
- project-local MCP: `install --target mcp` writes the shipped MCP bundle into `.codex/config.toml`
- user-local MCP: `install --target mcp --scope local` writes the shipped MCP bundle into `${CODEX_HOME:-~/.codex}/config.toml`
- user-local memories: `install --target memories --scope local` updates only `${CODEX_HOME:-~/.codex}/config.toml`

The default scaffold leaves the workspace plugin and hooks out. Include the plugin during init, or include every project-scoped optional bundle:

```bash
npx @longkunz/codex-kit init --include-plugin
npx @longkunz/codex-kit init --all
```

`--all` includes the plugin and project hooks. It does not enable user-local memories.

The installed plugin bundles its Codex Kit skill, safe local hooks, and the `context7` MCP configuration. Hook scripts do not make network calls or log prompt text, file contents, or environment values.

For a freshly generated project marketplace, register the project and add the plugin with Codex CLI:

```bash
codex plugin marketplace add /path/to/project
codex plugin add codex-kit@local-plugins
```

Run `codex-kit doctor` first to validate the marketplace name, source path, policy, plugin metadata, bundled hooks, MCP config, and package version. Codex Kit prepares the local marketplace files but does not modify the user's global Codex plugin registry.

The hook bundle creates:

- `.codex/hooks.json`
- `.codex/hooks/user_prompt_secret_scan.mjs`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/post_tool_use_log.mjs`
- `.codex/hooks/stop_validation.mjs`

Hooks are safe by default: they run locally, do not make network calls, and do not log prompt text, file contents, or environment values. Existing hook files are not overwritten unless you pass `--force`.

The shipped MCP bundle currently includes:

- `context7` for developer documentation
- a commented `mysql` example via `@benborla29/mcp-server-mysql`; uncomment it only when you want to enable MySQL MCP intentionally

Memories are opt-in and user-local only. To enable them:

```bash
npx @longkunz/codex-kit install --target memories --scope local
npx @longkunz/codex-kit setup-codex --enable-memories
```

This writes only to `${CODEX_HOME:-~/.codex}/config.toml`:

```toml
[features]
memories = true

[memories]
use_memories = true
generate_memories = true
disable_on_external_context = true
```

Project scaffolds never enable memories by default and never write personal memory content.

## Skill Catalog by Category

Categories group skills by responsibility. Profiles are installation bundles for optional skills; a category is not necessarily a profile.

| Category | Purpose | Core skills | Optional skills |
|---|---|---|---|
| Planning & Routing | Plan, clarify, and route implementation work. | `architecture`, `brainstorming`, `planning`, `repo-onboarding` | `app-builder`, `parallel-agents` |
| Backend & Platform | API, database, and platform-specific patterns. | `api-patterns`, `database-design` | `mcp-builder`, `nodejs-best-practices`, `python-patterns`, `rust-pro` |
| Frontend & UI | Web and mobile UI design and frameworks. | `frontend-design`, `tailwind-patterns`, `web-design-guidelines` | `game-development`, `i18n-localization`, `mobile-design`, `nextjs-react-expert` |
| Debugging & Review | Evidence-based debugging and code review. | `code-review`, `debugging` | — |
| Testing & Validation | Unit, integration, and validation strategies. | `lint-and-validate`, `test-hardening`, `testing` | `tdd-workflow`, `webapp-testing` |
| Docs, Delivery & Operations | Documentation, deployment, and operational process. | `documentation`, `release-deployment` | `doc`, `mcp-onboarding`, `server-management` |
| Security, Performance & Discoverability | Security review, profiling, and search optimization. | `security-review` | `geo-fundamentals`, `performance-profiling`, `red-team-tactics`, `seo-fundamentals` |
| Shell & Environment | Shell scripting and OS-specific patterns. | — | `bash-linux`, `powershell-windows` |

- **Core**: installed by default with `codex-kit init`.
- **Optional**: installed through a profile or `codex-kit install skill <name>`.

## Profiles

Profiles are named bundles that install core skills plus a curated set of optional skills in one step:

```bash
codex-kit init --profile backend-node
```

| Profile | Optional skills included |
|---|---|
| `backend-node` | `nodejs-best-practices` |
| `backend-python` | `python-patterns` |
| `rust` | `rust-pro` |
| `frontend-framework` | `i18n-localization`, `nextjs-react-expert`, `webapp-testing` |
| `mobile` | `mobile-design` |
| `game` | `game-development` |
| `mcp` | `mcp-builder`, `mcp-onboarding` |
| `security-advanced` | `red-team-tactics` |
| `performance` | `performance-profiling` |
| `operations` | `bash-linux`, `powershell-windows`, `server-management` |
| `discoverability` | `geo-fundamentals`, `seo-fundamentals` |
| `documents` | `doc` |
| `tdd` | `tdd-workflow` |
| `scaffolding` | `app-builder` |

`parallel-agents` is an optional skill that does not belong to any profile. Install it directly:

```bash
codex-kit install skill parallel-agents
```

## Automatic Skill Detection

`codex-kit autoskills` detects the repository's technology stack and installs matching skills from Codex Kit's canonical catalog.

It is an installation helper. It does not control which skill Codex activates while responding to a prompt.

Preview the detected technologies and selected skills without writing files:

```bash
codex-kit autoskills --dry-run
```

Install the detected skills:

```bash
codex-kit autoskills
```

For example, a project using React, Next.js, and Playwright may select:

- `frontend-design`
- `nextjs-react-expert`
- `seo-fundamentals`
- `testing`
- `web-design-guidelines`
- `webapp-testing`

The command reports both the number of selected skills and the number of files written. A single skill may contain multiple files, such as `SKILL.md`, references, scripts, agent metadata, and verification instructions.

Autoskills scans signals such as:

- `package.json`
- `pyproject.toml`
- `Cargo.toml`
- `go.mod`
- `Gemfile`
- framework and testing configuration files
- source extensions such as `.tsx`, `.sh`, and `.ps1`

It only installs skills shipped in Codex Kit's audited catalog. It does not download skills from third-party registries or resolve legacy skill names.

Detected skills are installed into `.agents/skills/`, and the detection summary is recorded in `.codex-kit/autoskills-lock.json`.

Use `--force` only when existing managed skill files should be refreshed.

To browse or search the shipped catalog, see `codex-kit list --target skills` in the [Command Quick Reference](#command-quick-reference).

## Codex Rules

Codex Kit ships a minimal execution policy template at `.codex/rules/default.rules`.

Older projects that still have `codex/rules/default.rules` are migrated during `init` when it is safe. If both paths exist, Codex Kit leaves the user files alone and prints a warning.

It is intentionally narrow:

- prompts before dependency installs such as `npm install` or `pnpm install`
- prompts before `git push`
- prompts before Codex Kit writes into local Codex with `--scope local`

It does not replace `AGENTS.md`, skills, or workflows. Those files still handle behavior and routing; `.codex/rules/default.rules` is only for sandbox approval policy.

## Doctor

Use `doctor` to validate a generated workspace:

```bash
npx @longkunz/codex-kit doctor
npx @longkunz/codex-kit doctor --json
npx @longkunz/codex-kit doctor --fix
```

Doctor validates `AGENTS.md`, skills, subagents, `.codex/config.toml`, rules, hooks, plugin marketplace flow and metadata, bundled plugin hooks/MCP, manifest consistency, and local memory status. Warnings do not fail by default; `--strict` treats warnings as failures. `--fix` performs safe repairs such as legacy rules-path migration and manifest resync for generated files that already exist on disk.

Default config and subagent templates leave model selections commented out, so Codex uses the account or environment default unless a project opts into an explicit model.

## Requirements

- Node.js `>=20`

## Documentation

- [Introduction](https://codexkit.xyz/#/docs/introduction)
- [Installation](https://codexkit.xyz/#/docs/installation)
- [Local Codex Setup](https://codexkit.xyz/#/docs/local-codex-setup)
- [CLI Reference](https://codexkit.xyz/#/docs/commands-and-options)

## License

MIT
