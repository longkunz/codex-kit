# Bug Hunt Checklist

Treat the first pass like an investigation, not a rewrite.

## Before Starting
- [ ] Can reproduce consistently
- [ ] Have minimal reproduction case
- [ ] Understand expected behavior

## During Investigation
- [ ] Restate the failure in terms of observable behavior.
- [ ] Reproduce it with the smallest reliable path.
- [ ] Narrow the boundary: input, environment, recent change, or data shape.
- [ ] Check logs, traces, tests, and call paths for evidence before editing code.
- [ ] Add logging if needed.
- [ ] Use debugger/breakpoints.

## Fix and Verification
- [ ] Fix the confirmed failure mode with the smallest defensible change.
- [ ] Add or strengthen a test so the bug stays fixed.
- [ ] Similar code checked for the same pattern.
- [ ] Root cause documented.

## Deliverable Standard
Produce a short bug brief with:
- reproduction steps
- expected vs actual behavior
- suspected root cause
- evidence collected
- fix strategy
- regression test plan
