#!/usr/bin/env python3
"""Write a minimal local tool-use audit record.

Only metadata is recorded: timestamp, hook name, tool name, and status-like
fields. Tool arguments, prompts, file contents, and environment values are not
written.
"""

import datetime as _dt
import json
from pathlib import Path
import sys


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = {}

    record = {
        "timestamp": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "hook": "PostToolUse",
        "tool": payload.get("tool_name") or payload.get("name") or "unknown",
        "status": payload.get("status") or payload.get("exit_code") or "unknown",
    }
    log_path = Path(".codex/hooks/tool-usage.jsonl")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf8") as handle:
        handle.write(json.dumps(record, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
