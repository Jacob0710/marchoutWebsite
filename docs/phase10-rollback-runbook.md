# Phase 10 rollback runbook

Rollback is scoped and evidence-preserving. It does not authorize destructive down migrations or deletion of originals. Stop all relevant mutations first, identify the exact batch/config/deploy, and retain the failed command, stable error, checkpoint token, audit identifiers, and reconciliation output.

## Decision tree

1. If only an unpromoted candidate or dry-run failed, discard the ignored candidate/cache and make no remote change.
2. If a release batch partially applied, use its manifest and current checkpoint token to roll back that batch.
3. If redirects were activated, deactivate/roll back the tracked redirect config before unpublishing targets.
4. If only application code failed and schema/data verify, redeploy the prior immutable artifact.
5. If a migration or data invariant failed, keep traffic/mutations paused and use a reviewed forward fix. Restore the isolated/production database only under the backup owner's recovery procedure.

## Release-batch rollback

Read the current batch and verify no unrelated operator changed its target versions. Then run:

```text
node scripts/phase10/release-batch.mjs --mode=rollback --manifest=<same-reviewed-manifest>
```

The database RPC accepts an eligible running, completed, or failed apply batch. It deactivates only redirects owned by that batch, restores each actually applied target's recorded pre-status and `published_at` in reverse order, and marks failed/pending items rolled back without pretending they were published. It refuses target-version conflicts. Re-run rollback to prove idempotency, then run release verification, full editorial reconciliation, public `404` checks, and audit checks.

Do not resume a batch after it has entered `failed`. Its failure checkpoint is evidence of a partial release, not permission to skip the failed item. Roll it back, correct and re-review the target, produce a new manifest/batch key and versions, and repeat dry-run.

If the RPC reports a conflict, do not overwrite the newer state. Preserve evidence and require a human-reviewed reconciliation plan.

## Conservative-decision rollback

Only the ignored state file created by the same apply may drive this rollback:

```text
node scripts/phase10/apply-conservative-decisions.mjs --mode=rollback
```

This restores recorded review/redirect decision fields; it does not publish content or delete audit history. A missing or mismatched state file requires manual evidence review, not reconstruction by guess.

## Redirect-config rollback

Every promotion writes the previous tracked config beneath ignored `.phase10-private/redirect-config-checkpoints/`. Review the checkpoint, calculate its canonical SHA-256, set the one-time confirmation to that exact hash, and run:

```text
node scripts/phase10/generate-redirect-config.mjs --mode=rollback --checkpoint=<checkpoint-file>
pnpm phase10:redirect:verify
pnpm phase10:redirect:verify:http -- --origin=<approved-source-origin>
```

After deployment/CDN propagation, prove affected sources no longer redirect and no cache serves the reverted rule. DNS or Wix routing rollback requires the external account owner.

## Application and database recovery

- Application: redeploy the recorded prior artifact; do not rebuild an old commit with drifting dependencies. Verify migrations remain compatible before traffic returns.
- Database: Phase 10 migrations are additive but revoke obsolete public metadata reads. There is no automatic down migration. Prefer a reviewed idempotent forward fix.
- Restore: only the backup owner may restore the exact pre-change backup after confirming the target environment and impact on unrelated writes. Re-run all Phase 5–10 SQL verification and compare the checkpoint counts/hashes afterward.
- Storage: originals are retained. Never recursively delete a bucket or derive cleanup targets from a broad prefix. Reconcile exact object paths/hashes and remove only documented orphan fixtures after review.

## Required post-rollback verification

- liveness/readiness and external synthetic checks pass;
- 70 imported targets remain distinct from the one existing Activity draft;
- editorial/review/redirect counts, provenance, RLS, grants, fixed search paths, and append-only audit pass;
- anonymous and non-admin users cannot read editorial data or private originals;
- public targets and proxies reflect the rolled-back publication state with correct no-store boundaries;
- active redirects have direct one-hop final `200` evidence; inactive/archive entries do not redirect or return an unauthorized `410`;
- Storage object/reference/hash reconciliation has zero unexplained missing/orphan entries;
- no temporary credentials, dumps, logs, screenshots, or raw documents entered Git.

Record the final reconciliation and the disposition of every failed item. Do not resume release work until the incident/release owner accepts the evidence.
