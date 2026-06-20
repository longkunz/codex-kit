---
name: code-review
description: Review patches, branches, or implementations for correctness, regressions, security, and missing tests. Use when the task is to inspect a diff or code change and identify concrete risks before merge.
---

# Code Review

Review for risk, not style theater. Lead with findings that affect correctness, security, and regression risk rather than stylistic preferences.

## Core References
You must read and follow these methodologies:
- [Code Review Checklist](references/checklist.md)
- [High-Signal Output Format](references/high-signal-output.md)

## Requirements
When reviewing code, you must:
- **Focus on behavior**: Follow inputs to outputs, checking state changes and error handling.
- **Hunt for regressions**: Verify existing call sites, migrations, and boundaries.
- **Review security**: Check for trust boundaries, validation, escaping, and secrets.
- **Review tests**: Confirm tests cover changed paths and assertions are meaningful.
- **Output high-signal findings**: Group findings by severity (High, Medium, Low), stating what is wrong, why it matters, where it is, and the triggering scenario.

If no concrete issues are found, state that explicitly and mention any residual risks such as limited context or untouched dependency surfaces.
