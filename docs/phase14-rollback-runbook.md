# Phase 14 rollback runbook

Status: **PLAN ONLY — PRODUCTION ROLLBACK NOT AUTHORIZED**.

## Triggers

Rollback on draft/private disclosure, authentication/admin boundary failure, destructive/unexpected data change, asset proxy/download failure, redirect loop/chain/wrong target, elevated critical errors, DNS/domain misrouting, SEO/canonical breakage, failed owner acceptance, irrecoverable UAT/cutover blocker, or lost evidence/observability.

## Preconditions

Name the rollback operator and decision authority; retain exact prior application release, database/Storage checkpoint, restore evidence, redirect/DNS/Wix before-state, TTL/window, monitoring queries, and a bounded rollback authorization. Wix remains available until the rollback window closes. Do not use a repository plan as production authority.

## Authorized response sequence

1. Declare no-go/incident; stop further batches and preserve sanitized evidence.
2. Revert the smallest approved layer: redirect batch, domain/DNS, application release, publication state, or data/Storage via the established checkpoint/runbook.
3. Never improvise a destructive database/Storage action; require its explicit scope.
4. Verify auth/privacy boundaries, public health, draft inaccessibility, asset proxies, redirects, DNS, and Wix fallback.
5. Record operator, authorization, timestamps, before/after hashes, affected scope, verification, residual risks, and owner decision without credentials or private content.

## Exit criteria

Service is restored to the approved known state, no private exposure continues, every partial batch is reconciled, credentials are revoked, monitoring is stable, owner/incident lead signs disposition, and a follow-up issue owns the root cause. If rollback itself cannot be verified, remain no-go and escalate; do not declare Phase 14 complete.
