# Phase 10 incident and monitoring runbook

The production owner is GitHub user `Jacob0710`. The scheduled `production-synthetic` job in `.github/workflows/production-synthetic.yml` checks `https://marchout-website.vercel.app` hourly on the free GitHub Actions/Vercel Hobby setup. Keeping this schedule separate prevents non-scheduled quality jobs from emitting repeated skipped check runs for an unchanged commit. A failed run is retained in GitHub Actions and uses the repository owner's configured Actions notification channel; the owner must investigate or pause mutations before any editorial release continues.

Monitoring must use an externally owned uptime/alerting system. This repository provides stable endpoints, redacted structured logs, and a read-only synthetic probe; it does not claim that a vendor, alert destination, or on-call owner exists until the operator records real evidence.

## Probes

- `GET /api/health`: process liveness, public, no-store, body status `ok`.
- `GET /api/health/ready`: content dependency readiness, public, no-store; returns stable `503` code `READINESS_DEPENDENCY_UNAVAILABLE` without project/schema detail.
- `pnpm phase10:synthetic`: checks health, public routes, security/cache headers, robots, sitemap, and redirect-config state without credentials or writes.
- `pnpm phase10:redirect:verify:http -- --origin=<approved-source-origin>`: mandatory after any redirect activation.

Run liveness and readiness at least every minute and the full synthetic check at least every five minutes from outside the hosting provider. Use the exact HTTPS origin. Retain only timestamp, environment, deploy id, check name, status, duration, and stable error code.

## Alert matrix

| Signal | Trigger | Initial action | Escalation |
| --- | --- | --- | --- |
| Liveness | two consecutive failures | Check deployment/process and recent release | Incident owner immediately |
| Readiness | two consecutive failures or 5 minutes degraded | Freeze mutations; inspect Supabase/network status | Database/platform owner |
| 5xx | sustained increase over 5 minutes | Correlate deploy and safe route template | Application owner |
| Admin/auth denial anomaly | material change from baseline | Check active-admin state and abuse indicators without logging identities | Security owner |
| Private proxy 403/404/5xx anomaly | sustained increase | Verify publication/RLS/Storage state; do not expose raw paths | Content/platform owner |
| Redirect loop/chain/final non-200 | any active entry | Disable affected redirect config and verify rollback | Release and DNS owners |
| Partial release batch | any failed/stale item | Stop batch; preserve checkpoint and audit ids | Editorial/release owner |
| Storage orphan/missing | any | Freeze publish/derivative work and reconcile inventory | Storage/database owner |
| Backup/restore overdue or failed | any scheduled miss | Block shared-environment mutation | Backup owner |

Thresholds and owners must be entered in the external operations record before production promotion. Placeholder addresses or untested alerts are not evidence.

## Logging privacy contract

Server logs use an allowlist: timestamp, environment, request id, route template, method, status, duration, coarse auth class, safe action/result/error code, and a one-way path hash where needed. Never log request/response bodies, raw query strings, email, names, filenames, Storage paths, signed URLs, cookies, authorization headers, JWTs, passwords, invitation tokens, database errors, or document content.

Operational logs are not editorial evidence. Limit access and retention according to the environment's approved policy. Test redaction before connecting an exporter.

## Incident response

1. Declare severity, timestamp, environment, and incident owner. Freeze publication, derivative, redirect, and deployment changes.
2. Capture deploy/commit, migration versions, release batch/checkpoint keys, redirect-config hash, health results, and redacted request ids.
3. Determine the smallest affected boundary: code, dependency, editorial batch, redirect config, Storage, auth, or DNS/TLS.
4. Contain using the narrow procedure in `docs/phase10-rollback-runbook.md`. Do not weaken RLS, make a bucket public, add broad grants, bypass same-origin, or log secrets to diagnose.
5. Run health, synthetic, SQL verification, identity matrix, public/private asset tests, and redirect HTTP verification as applicable.
6. Restore service only after two-person review. Record actual result, residual risk, and follow-up owner.
7. For suspected privacy exposure, preserve access evidence, revoke the public derivative/route, involve the designated privacy owner, and avoid copying exposed material into tickets or Git.

## Production evidence gate

Production is blocked until a real monitoring evidence identifier demonstrates that liveness, readiness, synthetic checks, alert delivery, retention/redaction, and an assigned response owner were tested on the final hostname.
