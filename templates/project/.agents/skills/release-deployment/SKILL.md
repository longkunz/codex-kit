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

## Requirements
When handling deployments, you must cover:
- **Pre-flight readiness**: Ensure tests, builds, and environments are prepared.
- **Migration & backward compatibility**: Identify risks in data shape transitions and dual-writes.
- **Rollout sequencing**: Order flag flips, migrations, and code deploys correctly.
- **Verification**: Actively monitor health endpoints, error logs, and key flows immediately after deployment.
- **Rollback safety**: Confirm that reverting the code will not leave the system broken due to irreversible side effects.
