#!/usr/bin/env node
/**
 * Write a minimal local tool-use audit record.
 *
 * Only metadata is recorded: timestamp, hook name, tool name, and status-like
 * fields. Tool arguments, prompts, file contents, and environment values are not
 * written.
 */

import fs from "node:fs";
import path from "node:path";

function main() {
  const raw = fs.readFileSync(0, "utf-8");
  let payload = {};
  
  if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }
  }

  const record = {
    timestamp: new Date().toISOString(),
    hook: "PostToolUse",
    tool: payload.tool_name || payload.name || "unknown",
    status: payload.status || payload.exit_code || "unknown"
  };

  const logPath = path.resolve(".codex/hooks/tool-usage.jsonl");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(record) + "\n", "utf8");
  
  process.exit(0);
}

main();
