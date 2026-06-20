---
name: debugging
description: Reproduce, isolate, and explain bugs before fixing them. Use when the task is about a bug, regression, failure, flaky behavior, unexpected output, or unclear runtime behavior that must be narrowed to a concrete cause.
---

# Debugging

Treat debugging as evidence collection and hypothesis elimination, not guess-and-patch. Reproduce the problem, shrink the failure surface, identify the concrete cause, and only then choose the fix.

## Core References
You must read and follow these methodologies:
- [Systematic Process](references/systematic-process.md)
- [Bug Hunt Checklist](references/debugging-checklist.md)

## Requirements
When debugging, you must cover:
- **Reproduce**: Find the smallest repeatable path to the failure.
- **Evidence collection**: Check logs, traces, and call paths.
- **Narrow scope**: Identify the specific boundary where correct behavior becomes incorrect.
- **Hypothesis & Root cause**: Formulate falsifiable hypotheses and isolate the exact cause.
- **Minimal fix**: Make the smallest defensible change to fix the verified cause.
- **Regression verification**: Add or strengthen tests and run the reproduction path again to prove the fix.
