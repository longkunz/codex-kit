#!/usr/bin/env node
/**
 * Print a local end-of-turn reminder without inspecting repository content.
 */

function main() {
  console.log("Codex Kit plugin hook: if files changed, run the relevant tests or linters before handing off.");
  process.exit(0);
}

main();
