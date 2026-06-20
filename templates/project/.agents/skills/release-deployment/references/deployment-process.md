# Deployment Process

## The 5-Phase Process

1. **PREPARE**: Verify code, build, env vars. Look for ordering assumptions (deploy, migrate, backfill, flag flip).
2. **BACKUP**: Save current state before changing.
3. **DEPLOY**: Execute with monitoring open.
4. **VERIFY**: Health check, logs, key flows.
5. **CONFIRM or ROLLBACK**: All good? Confirm. Issues? Rollback.

## Deployment Workflow

1. **Identify the release surface**: Determine what is changing in runtime behavior, data shape, or operator workflow.
2. **Look for ordering assumptions**: Sequence cache warmup, migrations, and code deployment properly.
3. **Test backward and forward compatibility**: Ensure the previous version can run against the new system state.
4. **Evaluate rollback realistically**: Check whether data, config, or one-way side effects make rollback unsafe.
5. **Inspect observability**: Verify that failure would be detectable quickly.

## Zero-Downtime Deployment
- **Rolling**: Replace instances one by one (Standard release).
- **Blue-Green**: Switch traffic between environments (High-risk change).
- **Canary**: Gradual traffic shift (Need validation).
