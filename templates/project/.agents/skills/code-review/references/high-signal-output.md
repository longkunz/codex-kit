# High-Signal Review Output

Lead with the issues most likely to hurt users, operators, or future change velocity.

## Finding Standard
A good finding is concrete and defensible. Each finding should state:
1. **What is wrong**: The specific issue.
2. **Why it matters**: The impact.
3. **Where it is**: Reference the exact file and line when possible.
4. **What scenario exposes it**: The trigger condition.

*Weak finding*: "This feels brittle."
*Strong finding*: "The new serializer assumes `profile` is always present, but the existing backfill leaves legacy rows null, so this path will raise on production data."

## Severity Guidance

### High Severity
Use for:
- incorrect behavior in common paths
- data loss or corruption
- security exposure
- crashers or deploy blockers

### Medium Severity
Use for:
- realistic edge-case failures
- contract mismatches
- incomplete fixes
- missing regression coverage on risky paths

### Low Severity
Use for:
- maintainability issues likely to cause future bugs
- weak assertions in otherwise useful tests
- minor but real correctness risks with narrow impact

## Output Shape
When writing the review:
1. List findings first, highest severity first.
2. Include file and line references when available.
3. Add open questions or assumptions only after findings.
4. Keep the summary brief and secondary.

If no findings are discovered, state that explicitly and note any residual uncertainty such as untested paths or limited context.
