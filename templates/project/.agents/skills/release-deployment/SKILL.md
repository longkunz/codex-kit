---
name: release-deployment
description: Production deployment principles and decision-making. Safe deployment workflows, rollback strategies, and verification. Use when a change may affect rollout, deployment, migrations, or operational stability.
---

# Deployment Procedures

Every deployment is unique. Understand the WHY behind each step and adapt procedures to your platform. Review whether a change is safe to merge, deploy, and roll back.

## Core References
You must read and follow these deployment standards:
- [Readiness Checklist](references/readiness-checklist.md)
- [Deployment Process](references/deployment-process.md)
- [Rollback Procedures](references/rollback.md)
- [Release Handoff](references/release-handoff.md)

## Requirements
When handling deployments, you must cover:
- **Pre-flight readiness**: Ensure tests, builds, and environments are prepared.
- **Migration & backward compatibility**: Identify risks in data shape transitions and dual-writes.
- **Rollout sequencing**: Order flag flips, migrations, and code deploys correctly.
- **Verification**: Actively monitor health endpoints, error logs, and key flows immediately after deployment.
- **Rollback safety**: Confirm that reverting the code will not leave the system broken due to irreversible side effects.

## Execution Rules
When executing a deployment or check, always state the explicit deployment mode: `readiness/check`, `preview or staging`, `production`, or `rollback`.
1. **Confirm Context**: Confirm the target environment and deployment platform.
2. **Execute Accurately**: Build, package, and deploy using the real project path and platform-specific commands.
3. **Report Action**: Clearly report the exact command or pipeline used.
4. **Report Output**: Record the deployed version, URL (when applicable), smoke/health check results, and rollback readiness/result.
