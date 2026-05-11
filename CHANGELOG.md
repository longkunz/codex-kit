# Changelog

All notable changes to this project are documented here.

## [v0.2.0] - 2026-05-11

Release: [v0.2.0](https://github.com/daominhhiep/codex-kit/releases/tag/v0.2.0)

### Added

- Added `autoskills` CLI command that scans the project stack (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, framework config files, file extensions, and content patterns) and installs only the matching shipped Codex Kit skills.
- Added 48 technology detectors and 8 cross-stack combo detectors (e.g. React + Tailwind CSS, Next.js + Playwright, FastAPI + SQLAlchemy) plus a frontend bonus bundle (`frontend-design`, `web-design-guidelines`, `seo-fundamentals`).
- Added `autoskills --scope local` to install matching skills into `${CODEX_HOME:-~/.codex}/skills`, and `autoskills --dry-run` to preview without writing.
- Added `.codex-kit/autoskills-lock.json` so each autoskills run is auditable (detected stack, combos, matched skills, install scope).
- Added `figma-to-code` workflow and a default `codex/rules/default.rules` execution policy template for project scaffolding.
- Added favicon and apple-touch-icon assets for the web docs site.

### Improved

- Migrated the web docs site from hash-based routing to standard URL paths with server-side rendering support.
- Expanded the workspace plugin skill so Codex can route natural language requests like "scan stack and install skills" or "tự động cài skill theo stack" to `npx @daominhhiep/codex-kit autoskills`.
- Inspired by [midudev/autoskills](https://github.com/midudev/autoskills): instead of fetching from third-party registries, autoskills selects from Codex Kit's audited shipped catalog so installs stay supply-chain safe.

## [v0.1.4] - 2026-04-02

Release: [v0.1.4](https://github.com/daominhhiep/codex-kit/releases/tag/v0.1.4)

### Added

- Implemented dynamic SEO management for docs with `robots.txt`, `sitemap.xml`, and JSON-LD support.
- Added MCP server support (`src/lib/mcp.js`) exposed via Codex Kit.
- Added support for OpenAI release-readiness agent workflow.
- Added `status` CLI command to verify project workspace state.

### Improved

- Refactored CLI argument parsing to use action-target operations instead of raw options.
- Renamed `LICENSE.txt` to `LICENSE`.

## [v0.1.3] - 2026-04-01

Release: [v0.1.3](https://github.com/daominhhiep/codex-kit/releases/tag/v0.1.3)

### Added

- Added `setup-codex` to scaffold the workspace plugin and install local Codex skills in one command.
- Added `sync-codex` to resync the workspace plugin and local shipped skills after upgrading the package.
- Added `list-skills` to show the shipped skill catalog by category, with quick install commands.
- Added `search-skills <query>` to find skills by name, summary, or category.
- Added `list-installed-skills` to show which Codex Kit skills are already installed in local Codex.
- Added selective `--skills` support for install, sync, and remove flows.
- Expanded the shipped skill catalog and local installation guidance.

### Improved

- Updated the Codex Kit plugin skill so it can better route natural requests such as installing frontend skills, listing debug skills, or syncing plugin and skills.
- Refreshed the plugin manifest copy to better describe repository scaffolding, Codex setup and sync, skill discovery, and local skill management.
- Reworked the README and web docs to make installation scopes, workflow usage, CLI commands, agents, and skill categories easier to understand.
- Added docs screenshots and image zoom support in the web docs for plugin installation and local skill installation flows.

### Notes

- `remove-skills` requires `--skills` to avoid accidental removal of the full local catalog.
- `install-skills` installs into `${CODEX_HOME:-~/.codex}/skills` by default.

## [v0.1.2] - 2026-04-01

Release: [v0.1.2](https://github.com/daominhhiep/codex-kit/releases/tag/v0.1.2)

### Added

- Added CLI support for local skill management.
- Added support for installing the Codex Kit plugin into a workspace.

### Improved

- Installed and configured Vercel Web Analytics.
- Installed Vercel Speed Insights.
- Upgraded the publish workflow to Node.js 24.

## [v0.1.1] - 2026-04-01

Release: [v0.1.1](https://github.com/daominhhiep/codex-kit/releases/tag/v0.1.1)

### Added

- Added new shipped skills for high-signal reviews, MCP onboarding, documentation shipping, bug hunting, and test hardening.
- Added automated npm and GitHub package publishing workflow support.

### Improved

- Refactored and clarified the project README.
- Added README badges for npm version, license, and project link.

## [v0.1.1-alpha] - 2026-04-01

Release: [v0.1.1-alpha](https://github.com/daominhhiep/codex-kit/releases/tag/v0.1.1-alpha)

### Improved

- Updated the publish workflow to use `npm install` instead of `npm ci`.
- Removed the npm cache step from the publish workflow.
