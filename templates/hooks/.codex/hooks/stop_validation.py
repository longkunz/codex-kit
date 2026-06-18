#!/usr/bin/env python3
"""Print a local end-of-turn reminder without inspecting repository content."""


def main() -> int:
    print("Codex Kit hook: if files changed, run the relevant tests or linters before handing off.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
