# Release Readiness Checklist

Review whether a change is safe to merge, deploy, and roll back. Focus on concrete release risk, missing safeguards, and validation gaps.

## Pre-Deployment Checklist
- [ ] **Tests & Code**: All tests passing, code reviewed, build successful.
- [ ] **Environment**: Env vars verified, secrets current.
- [ ] **Migrations**: Database migrations ready.
- [ ] **Rollback**: Rollback plan documented and feasible.
- [ ] **Monitoring**: Alerts and monitoring ready.
- [ ] **Team**: Team notified.

## Release Readiness Review Focus
- **Rollout coupling**: feature flags, config switches, sequencing, and phased enablement.
- **Deployment impact**: build, env vars, infra assumptions, runtime compatibility, and startup behavior.
- **Migration safety**: backward compatibility, data shape transitions, dual-read or dual-write needs, and ordering constraints.
- **Rollback readiness**: whether old and new versions can coexist and whether rollback leaves data or traffic in a broken state.
- **Operational stability**: rate limits, timeouts, retries, and failure containment.
