# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [1.3.0] - 2026-06-21

### Changed

* Introduced a safe, declarative workflow retirement migration engine.
* Merged 9 legacy workflows (`brainstorm.md`, `test.md`, `orchestrate.md`, `plan.md`, `deploy.md`, `ship.md`, `verify.md`, `debug.md`, `review.md`) directly into their corresponding skills, reducing the cognitive load of navigating the repository.
* The repository now tracks and distributes only 7 focused workflows instead of 16.
* Consolidated release/deployment constraints and test-hardening policies inside cross-skill routing rules instead of standalone workflows.

## [1.2.0] - 2026-06-20

### Added

* Added tiered skill catalog and profile installs. Users can now install a curated set of optional skills with `--profile <name>` (e.g., `backend-node`, `frontend-framework`, `rust`, etc.).
* Added the `autoskills` command to automatically detect the repository's technology stack and install matching canonical skills from the catalog.

### Changed

* Reorganized the README command list and skill references to improve discoverability.
* Restructured skill documentation to explicitly clarify core vs. optional skills.

## [1.1.0] - 2026-06-20

### Changed

* Skills are now exclusively installed into the current project repository (`<repo>/.agents/skills`). User-scope skill installation is no longer supported.
  - `setup-codex` now installs shipped skills into the project scope instead of `~/.codex/skills`.
  - `sync-codex` now syncs shipped skills in the project scope instead of `~/.codex/skills`.
  - `autoskills` always writes to the project scope; `--scope local` is ignored and treated as `project`.

### Removed

* Removed CLI flag `--scope local` for `--target skills` (install, sync, list). Passing it now returns a clear error.
* Removed legacy commands: `install-skills`, `sync-skills`, `remove-skills`, `list-installed-skills`. These now return a removal error with a migration hint.
* Removed `autoskills --scope local`; the command always uses project scope.

### Migration

If you previously used `install-skills` or `--scope local --target skills`, use:

```
codex-kit install --target skills
```

to install skills into the current project instead.

## [1.0.0] - 2026-06-19

### Added

* Added project-level Codex rules under `.codex/rules`.
* Added `codex-kit doctor` for validating generated projects and managed files.
* Added optional project hooks implemented with Node.js `.mjs` scripts.
* Added local Codex memories configuration support.
* Added MCP configuration installation and manifest tracking.
* Added workspace plugin installation through `init --include-plugin` and `init --all`.
* Added marketplace generation and validation.
* Added Common Guidelines to the default `AGENTS.md` template.
* Added `.codex/rules/common-guidelines.rules`.
* Added regression tests for ownership, synchronization, migration, hooks, MCP, marketplace, plugin, and Common Guidelines behavior.

### Changed

* Renamed the npm package to `@longkunz/codex-kit`.
* Reset the package version to `1.0.0` for the new npm package.
* Moved project rules from `codex/rules` to the Codex-compatible `.codex/rules` directory.
* Updated plugin metadata to stay synchronized with the npm package version.
* Changed default project templates to avoid hard-coded model pins.
* Changed hook implementations from Python to Node.js.
* Changed managed-file synchronization to preserve user-owned and user-modified files.
* Changed marketplace synchronization to preserve user customization unless `--force` is used.

### Fixed

* Fixed skipped user-owned files being incorrectly adopted and overwritten by later synchronization.
* Fixed `doctor --fix` silently rebaselining user-modified files.
* Fixed MCP configuration not being represented correctly in the project manifest.
* Fixed stale manifest entries after legacy rules migration.
* Fixed marketplace files being overwritten without `--force`.
* Fixed plugin marketplace policy validation.
* Fixed plugin version mismatches after changing the npm package version.
* Fixed repeated initialization creating duplicate or inconsistent manifest entries.

### Notes

* Existing user-owned `AGENTS.md` files are preserved during normal initialization.
* `--force` may replace managed templates with the current Codex Kit defaults.
* Hooks, plugin marketplace integration, and local memories remain optional.
