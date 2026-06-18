#!/usr/bin/env python3
"""Block obviously dangerous shell commands by default.

The hook reads tool metadata locally and reports only the policy name that
matched. It does not log command text, file content, prompt text, or env vars.
"""

import json
import re
import sys


BLOCK_RULES = [
    ("recursive forced delete", re.compile(r"(?i)(^|\s)(rm|del|remove-item)\s+.*(-rf|-r\s+-f|/s)")),
    ("git history reset", re.compile(r"(?i)\bgit\s+reset\s+--hard\b")),
    ("shell download pipe", re.compile(r"(?i)\b(curl|wget|irm|iwr)\b.+\|\s*(sh|bash|powershell|pwsh)\b")),
    ("environment dump", re.compile(r"(?i)(^|\s)(env|printenv|set)\s*(>|$)")),
]


def flatten_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from flatten_strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from flatten_strings(item)


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = raw

    text = "\n".join(flatten_strings(payload))
    for label, pattern in BLOCK_RULES:
        if pattern.search(text):
            print(
                f"Codex Kit plugin hook blocked a shell command matching policy: {label}. "
                "Review and run manually only if intended.",
                file=sys.stderr,
            )
            return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
