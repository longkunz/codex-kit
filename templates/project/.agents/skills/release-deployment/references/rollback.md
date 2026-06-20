# Rollback Procedures

## Principles
1. **Speed over perfection**: Rollback first, debug later.
2. **Don't compound errors**: One rollback, not multiple changes.
3. **Communicate**: Tell team what happened.
4. **Post-mortem**: Understand why after stable.

## When to Rollback
- **Service down**: Rollback immediately.
- **Critical errors**: Rollback.
- **Performance >50% degraded**: Consider rollback.
- **Minor issues**: Fix forward if quick.

## Evaluate Rollback Realistically
Do not stop at "can revert the code." Check whether data, config, or one-way side effects make rollback unsafe or incomplete. Verify that the previous version can tolerate the new data state if migrations ran.
