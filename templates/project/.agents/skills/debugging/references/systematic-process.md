# Systematic Debugging Process

## Overview
Treat debugging as evidence collection and hypothesis elimination, not guess-and-patch.

## 4-Phase Debugging Process

### Phase 1: Reproduce
Before fixing, reliably reproduce the issue. Find the smallest repeatable path to the failure.
- Exact step to reproduce
- Expected vs actual result
- Reproduction Rate (Always, Often, Sometimes, Rare)

### Phase 2: Isolate
Narrow down the source.
- When did this start happening?
- What changed recently?
- Does it happen in all environments?
- Can we reproduce with minimal code?
- What's the smallest change that triggers it?

### Phase 3: Understand
Find the root cause, not just symptoms.
Use "The 5 Whys" to reach the actual root cause rather than stopping at the first observation.

### Phase 4: Fix & Verify
Fix and verify it's truly fixed.
- Bug no longer reproduces
- Related functionality still works
- No new issues introduced
- Test added to prevent regression

## Anti-Patterns
- Random changes - "Maybe if I change this..."
- Ignoring evidence - "That can't be the cause"
- Assuming without proof
- Not reproducing first - Fixing blindly
- Stopping at symptoms - Not finding root cause
