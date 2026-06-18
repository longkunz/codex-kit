#!/usr/bin/env python3
"""Warn when a submitted prompt appears to contain secrets.

This hook inspects stdin locally, prints only generic findings, and never logs
or sends prompt content anywhere.
"""

import re
import sys


SECRET_PATTERNS = [
    ("api key", re.compile(r"(?i)\b(api[_-]?key|secret|token)\b\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{20,}")),
    ("private key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("aws key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("github token", re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b")),
]


def main() -> int:
    payload = sys.stdin.read()
    matches = [label for label, pattern in SECRET_PATTERNS if pattern.search(payload)]
    if not matches:
        return 0

    labels = ", ".join(sorted(set(matches)))
    print(
        f"Codex Kit hook blocked this prompt because it appears to contain: {labels}. "
        "Remove secrets before continuing.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
