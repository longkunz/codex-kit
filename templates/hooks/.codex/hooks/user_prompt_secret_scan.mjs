#!/usr/bin/env node
/**
 * Warn when a submitted prompt appears to contain secrets.
 *
 * This hook inspects stdin locally, prints only generic findings, and never logs
 * or sends prompt content anywhere.
 */

import fs from "node:fs";

const SECRET_PATTERNS = [
  { label: "api key", pattern: /(?:api[_-]?key|secret|token)\b\s*[:=]\s*['"]?[A-Za-z0-9_\-]{20,}/i },
  { label: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: "aws key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "github token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ }
];

function main() {
  const payload = fs.readFileSync(0, "utf-8");
  const matches = SECRET_PATTERNS.filter(({ pattern }) => pattern.test(payload)).map(({ label }) => label);

  if (matches.length === 0) {
    process.exit(0);
  }

  const labels = [...new Set(matches)].sort().join(", ");
  console.error(
    `Codex Kit hook blocked this prompt because it appears to contain: ${labels}. ` +
    "Remove secrets before continuing."
  );
  process.exit(2);
}

main();
