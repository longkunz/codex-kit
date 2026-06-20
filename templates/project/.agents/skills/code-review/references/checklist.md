# Code Review Checklist

Review for risk, not style theater. Focus on whether the change is correct, whether it breaks adjacent behavior, whether it introduces security or reliability problems, and whether tests cover the new failure surface.

## Correctness & Regressions
- [ ] Code does what it's supposed to do and handles edge cases.
- [ ] No partial updates where one layer changed and another did not.
- [ ] Existing call sites, contracts, defaults, and migrations are intact.
- [ ] Empty states, null handling, and boundary conditions are handled.
- [ ] Error handling and cleanup paths are in place.
- [ ] Concurrency, caching, and retry behavior is verified when relevant.

## Security & Safety
- [ ] Input validated and sanitized. Trust boundaries enforced.
- [ ] No injection vulnerabilities (SQL/NoSQL/XSS/CSRF).
- [ ] No hardcoded secrets or sensitive credentials.
- [ ] Logs, errors, or metrics do not leak sensitive data.
- [ ] Irreversible actions have guards or rollback paths.
- [ ] **AI-Specific:** Protection against Prompt Injection; outputs sanitized before critical sinks.

## Missing Validation & Tests
- [ ] Tests cover the changed behavior and the main failure modes.
- [ ] Missing regression tests are added where the patch fixes a bug.
- [ ] Assertions are strong enough to catch the intended breakage.
- [ ] Note when coverage exists but misses the risky path.
