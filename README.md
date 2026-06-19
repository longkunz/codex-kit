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
- 40+ shipped skills in `.agents/skills`
- 16 workflow playbooks in `.agents/workflows`
- 16 focused subagents in `.codex/agents`
- shared UI/UX data and scripts in `.agents/.shared`
- project-scoped Codex config in `.codex/config.toml`
- Codex execution rules in `.codex/rules/default.rules`
- optional project hooks in `.codex/hooks.json` and `.codex/hooks/`
- managed-file tracking in `.codex-kit/manifest.json`

## CLI

Primary commands:

```bash
codex-kit init
codex-kit init --include-plugin
codex-kit init --all
codex-kit install
codex-kit install --target plugin
codex-kit install --target mcp
codex-kit install --target skills
codex-kit install --target skills --scope local
codex-kit install --target hooks
codex-kit install --target memories --scope local
codex-kit update
codex-kit sync --target mcp
codex-kit sync --target plugin
codex-kit sync --target skills
codex-kit sync --target skills --scope local
codex-kit sync --target hooks
codex-kit list --target skills
codex-kit list --target skills --query frontend
codex-kit list --target skills --scope local
codex-kit list --target plugin
codex-kit list --target mcp
codex-kit remove --target skills --scope local --skills clean-code,planning
codex-kit autoskills
codex-kit autoskills --scope local
codex-kit autoskills --dry-run
codex-kit setup-codex
codex-kit setup-codex --enable-memories
codex-kit sync-codex
codex-kit status
codex-kit doctor
codex-kit doctor --json
codex-kit doctor --fix
```

Common examples:

```bash
codex-kit init --path ./my-project
codex-kit init --path ./my-project --include-plugin
codex-kit init --path ./my-project --all
codex-kit install --path ./my-project
codex-kit install --target plugin
codex-kit install --target mcp
codex-kit install --target skills
codex-kit install --target hooks
codex-kit install --target memories --scope local
codex-kit doctor

codex-kit list --target skills
codex-kit list --target skills --query frontend
codex-kit list --target skills --scope local
codex-kit list --target mcp

codex-kit install --target skills --scope local
codex-kit install --target skills --scope local --skills clean-code,planning
codex-kit sync --target skills --scope local --skills clean-code,planning
codex-kit remove --target skills --scope local --skills clean-code,planning

codex-kit setup-codex
codex-kit setup-codex --enable-memories
codex-kit sync-codex
```

Legacy aliases still work:

```bash
codex-kit install --target project
codex-kit sync --target project
codex-kit list-skills
codex-kit search-skills frontend
codex-kit list-installed-skills
codex-kit install-skills
codex-kit sync-skills
codex-kit remove-skills --skills clean-code,planning
```

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
- user-local: the shipped skill catalog is installed into `${CODEX_HOME:-~/.codex}/skills`
- user-local MCP: `install --target mcp --scope local` writes the shipped MCP bundle into `${CODEX_HOME:-~/.codex}/config.toml`
- user-local memories: `install --target memories --scope local` updates only `${CODEX_HOME:-~/.codex}/config.toml`

To scaffold a project:

```bash
npx @longkunz/codex-kit init
npx @longkunz/codex-kit install
```

The default scaffold leaves the workspace plugin and hooks out. Include the plugin during init, or include every project-scoped optional bundle:

```bash
npx @longkunz/codex-kit init --include-plugin
npx @longkunz/codex-kit init --all
```

`--all` includes the plugin and project hooks. It does not enable user-local memories.

To install only the workspace plugin into the current project:

```bash
npx @longkunz/codex-kit install --target plugin
```

The installed plugin bundles its Codex Kit skill, safe local hooks, and the `context7` MCP configuration. Hook scripts do not make network calls or log prompt text, file contents, or environment values.

For a freshly generated project marketplace, register the project and add the plugin with Codex CLI:

```bash
codex plugin marketplace add /path/to/project
codex plugin add codex-kit@local-plugins
```

Run `codex-kit doctor` first to validate the marketplace name, source path, policy, plugin metadata, bundled hooks, MCP config, and package version. Codex Kit prepares the local marketplace files but does not modify the user's global Codex plugin registry.

To install only the shipped project skills into the current project:

```bash
npx @longkunz/codex-kit install --target skills
```

To install the optional safe hook bundle into the current project:

```bash
npx @longkunz/codex-kit install --target hooks
```

The hook bundle creates:

- `.codex/hooks.json`
- `.codex/hooks/user_prompt_secret_scan.mjs`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `.codex/hooks/post_tool_use_log.mjs`
- `.codex/hooks/stop_validation.mjs`

Hooks are safe by default: they run locally, do not make network calls, and do not log prompt text, file contents, or environment values. Existing hook files are not overwritten unless you pass `--force`.

To install the shipped MCP bundle into the project or local Codex config:

```bash
npx @longkunz/codex-kit install --target mcp
npx @longkunz/codex-kit install --target mcp --scope local
```

The shipped MCP bundle currently includes:

- `context7` for developer documentation
- a commented `mysql` example via `@benborla29/mcp-server-mysql`; uncomment it only when you want to enable MySQL MCP intentionally

To do the full local setup in one go for the current repository:

```bash
npx @longkunz/codex-kit setup-codex
```

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

After upgrading Codex Kit, sync both the workspace plugin and local shipped skills:

```bash
npx @longkunz/codex-kit sync-codex
```

To install the shipped skills into local Codex:

```bash
npx @longkunz/codex-kit install --target skills --scope local
```

By default, local skills are installed into:

```text
${CODEX_HOME:-~/.codex}/skills
```

## Autoskills

Inspired by [midudev/autoskills](https://github.com/midudev/autoskills), Codex Kit ships its own auto-detection command. Instead of pulling from third-party registries, it scans the project stack and installs only the relevant skills from Codex Kit's audited catalog.

```bash
npx @longkunz/codex-kit autoskills
npx @longkunz/codex-kit autoskills --scope local
npx @longkunz/codex-kit autoskills --dry-run
```

The scanner inspects `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, framework config files (Next.js, Tailwind, Playwright, Vitest, ...) and file extensions (`.sh`, `.ps1`, `.tsx`, ...). It also recognizes cross-stack combos such as `React + Tailwind CSS`, `Next.js + Playwright`, or `FastAPI + SQLAlchemy`, and adds a small "frontend bonus" (design + SEO) when a web frontend is detected.

Project-scope installs land in `.agents/skills/<skill>/` next to the rest of the Codex Kit scaffold, and write a digest of the run to `.codex-kit/autoskills-lock.json`. Local-scope installs land in `${CODEX_HOME:-~/.codex}/skills`. Pass `--force` to overwrite existing files; the default behavior is non-destructive.

To browse or search the shipped catalog:

```bash
npx @longkunz/codex-kit list --target skills
npx @longkunz/codex-kit list --target skills --query frontend
npx @longkunz/codex-kit list --target skills --scope local
```

The bundled plugin can also help map natural requests such as "cài skill frontend" or "liệt kê skills debug" to the right Codex Kit commands.

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
