---
name: codex-kit
description: Use the Codex Kit CLI to initialize, update, or inspect a Codex-ready project scaffold in the current workspace.
---

# Codex Kit

Use this skill when the user wants to bootstrap or maintain the Codex Kit scaffold, or when they want to use the local Codex Kit workflows that are already present in the current repository.

## Commands

- `npx @daominhhiep/codex-kit init` or `npx @daominhhiep/codex-kit install` to initialize the scaffold in the current repository.
- `npx @daominhhiep/codex-kit init --include-plugin` to initialize the scaffold and stage the workspace plugin marketplace.
- `npx @daominhhiep/codex-kit init --all` to initialize the scaffold with the workspace plugin and safe project hooks. This does not enable local memories.
- `npx @daominhhiep/codex-kit update` to refresh managed files from the shipped template.
- `npx @daominhhiep/codex-kit install --target plugin` to install only the workspace plugin into the current project.
- `npx @daominhhiep/codex-kit install --target mcp` to install the shipped MCP bundle into the current project's `.codex/config.toml`.
- `npx @daominhhiep/codex-kit install --target skills` to install only the shipped project skill bundle into the current project.
- `npx @daominhhiep/codex-kit install --target mcp --scope local` to install the shipped MCP bundle into `${CODEX_HOME:-~/.codex}/config.toml`.
- `npx @daominhhiep/codex-kit sync --target plugin` to sync the workspace plugin in a scaffolded project.
- `npx @daominhhiep/codex-kit sync --target mcp` to sync the shipped MCP bundle in the current project config.
- `npx @daominhhiep/codex-kit sync --target skills` to sync the shipped project skill bundle in the current project.
- `npx @daominhhiep/codex-kit setup-codex` to scaffold the plugin into the workspace and install shipped skills locally.
- `npx @daominhhiep/codex-kit sync-codex` to sync the workspace plugin and local shipped skills after upgrading Codex Kit.
- `npx @daominhhiep/codex-kit list --target skills` to list all shipped skills grouped by category.
- `npx @daominhhiep/codex-kit list --target skills --query frontend` to search shipped skills by query.
- `npx @daominhhiep/codex-kit list --target skills --scope local` to show which shipped skills are already installed in local Codex.
- `npx @daominhhiep/codex-kit status` to inspect managed-file state.
- `npx @daominhhiep/codex-kit doctor` to validate the project, plugin marketplace, bundled hooks/MCP, and manifest consistency.
- `npx @daominhhiep/codex-kit install --target skills --scope local` to copy the shipped Codex Kit skills into local Codex.
- `npx @daominhhiep/codex-kit sync --target skills --scope local` to overwrite local Codex skills with the shipped Codex Kit version.
- `npx @daominhhiep/codex-kit remove --target skills --scope local --skills clean-code,planning` to remove specific Codex Kit skills from local Codex.
- `npx @daominhhiep/codex-kit autoskills` to auto-detect the project's tech stack and install matching shipped skills into `.agents/skills/`.
- `npx @daominhhiep/codex-kit autoskills --scope local` to install matching shipped skills into `${CODEX_HOME:-~/.codex}/skills` instead.
- `npx @daominhhiep/codex-kit autoskills --dry-run` to preview the detected stack and matching skills without writing any files.

## Rules

- Run commands from the repository root unless the user gives a different target path.
- Use `npx @daominhhiep/codex-kit ...` so the plugin works as a standalone published package.
- Before `update`, inspect current status so local modifications to managed files are visible.
- Prefer the new `install` / `sync` / `list` command family in suggestions, but continue to recognize legacy aliases.
- Treat workflows as local project resources, not as CLI commands.
- If the repository already contains `.agents/workflows/`, prefer following those workflow files directly instead of searching npm or package cache.
- Normalize common workflow aliases before acting:
  - `ui-ux-promax`, `ui ux promax`, `uix promax` -> `ui-ux-pro-max`
  - `review workflow` -> `review`
  - `ship workflow` -> `ship`
- If the user asks to use a workflow from Codex Kit and the repository is not scaffolded yet, explain that the workflow lives in the project scaffold and suggest `npx @daominhhiep/codex-kit init` or `npx @daominhhiep/codex-kit install`.

## Intent Mapping

- If the user asks to list available skills, run `npx @daominhhiep/codex-kit list --target skills`.
- If the user asks to search skills by topic, run `npx @daominhhiep/codex-kit list --target skills --query <query>`.
- If the user asks to install the project skill bundle into the current repository, run `npx @daominhhiep/codex-kit install --target skills`.
- If the user asks to add the shipped MCP bundle into the current repository config, run `npx @daominhhiep/codex-kit install --target mcp`.
- If the user asks to add the shipped MCP bundle into local Codex config, run `npx @daominhhiep/codex-kit install --target mcp --scope local`.
- If the user asks to install a skill by name into local Codex, run `npx @daominhhiep/codex-kit install --target skills --scope local --skills <name>`.
- If the user asks to install a skill by topic such as `frontend`, `debug`, or `seo`, search first, then either:
  - show matching skills with install commands, or
  - install the exact skill only if the request clearly names one skill.
- If the user asks to list installed local skills, run `npx @daominhhiep/codex-kit list --target skills --scope local`.
- If the user asks to update both the workspace plugin and local skills, run `npx @daominhhiep/codex-kit sync-codex`.
- If the user asks to initialize with the workspace plugin, run `npx @daominhhiep/codex-kit init --include-plugin`.
- If the user asks for all project-scoped setup, run `npx @daominhhiep/codex-kit init --all`; do not enable memories unless separately requested.
- If the user asks for initial full setup in the current repository, run `npx @daominhhiep/codex-kit setup-codex`.
- If the user asks Codex Kit to auto-detect the stack and install the right skills (for example, "scan the project and install the skills I need"), run `npx @daominhhiep/codex-kit autoskills`.
- If the user wants the same auto-detection but installed into local Codex, run `npx @daominhhiep/codex-kit autoskills --scope local`.
- If the user wants to preview which skills autoskills would install, run `npx @daominhhiep/codex-kit autoskills --dry-run`.
- If the user asks to use a Codex Kit workflow in the current repository, first check whether `.agents/workflows/<name>.md` exists in the workspace and then follow that workflow locally.
- If the user asks for a workflow by an alias such as `ui-ux-promax`, map it to the canonical file name `ui-ux-pro-max`.
- If the repository has Codex Kit scaffolding and the workflow file exists, do not search npm, package cache, or remote docs first.
- If the workflow file does not exist, explain that the repository is missing the scaffolded workflow and then suggest the smallest relevant scaffold command.

## Natural Language Examples

- `liệt kê skills debug` -> `npx @daominhhiep/codex-kit list --target skills --query debug`
- `cài skill frontend-design` -> `npx @daominhhiep/codex-kit install --target skills --scope local --skills frontend-design`
- `cài skill frontend` -> search first, then suggest exact matches such as `frontend-design`, `nextjs-react-expert`, or `tailwind-patterns`
- `xem local codex đã cài skill gì` -> `npx @daominhhiep/codex-kit list --target skills --scope local`
- `đồng bộ lại plugin và skills` -> `npx @daominhhiep/codex-kit sync-codex`
- `tự động cài skill theo stack` -> `npx @daominhhiep/codex-kit autoskills`
- `auto detect stack and install skills` -> `npx @daominhhiep/codex-kit autoskills`
- `xem trước autoskills` / `preview autoskills` -> `npx @daominhhiep/codex-kit autoskills --dry-run`
- `dùng workflow ui-ux-promax của codex kit` -> resolve to `.agents/workflows/ui-ux-pro-max.md` in the current repository and follow that workflow
- `use the plan workflow from codex kit` -> resolve to `.agents/workflows/plan.md` in the current repository and follow it directly
- `follow the review workflow in this repo` -> use `.agents/workflows/review.md` from the workspace, not the npm package
- The shipped MCP bundle currently includes `context7` and a commented `mysql` example using `@benborla29/mcp-server-mysql`.

## Output

- If you used the CLI, explain which command you ran.
- If you used a local workflow, name the workflow file you followed.
- Summarize which managed files were created, updated, or already up to date when the task involved scaffold changes.
