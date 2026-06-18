#!/usr/bin/env node
/**
 * Block obviously dangerous shell commands by default.
 *
 * The hook reads tool metadata locally and reports only the policy name that
 * matched. It does not log command text, file content, prompt text, or env vars.
 */

import fs from "node:fs";

const BLOCK_RULES = [
  { label: "recursive forced delete", pattern: /(?:^|\s)(?:rm|del|remove-item)\s+.*(?:-rf|-r\s+-f|\/s)/i },
  { label: "git history reset", pattern: /\bgit\s+reset\s+--hard\b/i },
  { label: "shell download pipe", pattern: /\b(?:curl|wget|irm|iwr)\b.+\|\s*(?:sh|bash|powershell|pwsh)\b/i },
  { label: "environment dump", pattern: /(?:^|\s)(?:env|printenv|set)\s*(?:>|$)/i }
];

function* flattenStrings(value) {
  if (typeof value === "string") {
    yield value;
  } else if (typeof value === "object" && value !== null) {
    for (const key of Object.keys(value)) {
      yield* flattenStrings(value[key]);
    }
  }
}

function main() {
  const raw = fs.readFileSync(0, "utf-8");
  let payload = {};
  
  if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  const text = Array.from(flattenStrings(payload)).join("\n");
  
  for (const { label, pattern } of BLOCK_RULES) {
    if (pattern.test(text)) {
      console.error(
        `Codex Kit hook blocked a shell command matching policy: ${label}. ` +
        "Review and run manually only if intended."
      );
      process.exit(2);
    }
  }
  
  process.exit(0);
}

main();
