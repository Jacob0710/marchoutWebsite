# Phase 14 redirect activation plan

Status: **PLAN ONLY — 0 REDIRECTS AUTHORIZED OR ACTIVATED**.

## Source set and validation

Start with Phase 9 URL evidence and Phase 10 owner decisions/config; preserve 52 `accepted_out_of_scope` rows as a separate historical domain. Before any activation, a human-authorized process must verify every exact encoded source path and intended destination against the approved hostname/release.

For every candidate, validate: unique normalized source; destination existence and one-hop final `200`; no source/destination loop; no multi-hop chain; no duplicate/conflicting source; intended `301`/`308` policy; trailing slash normalization; query preservation policy; percent/Unicode encoding; fragments (not sent to servers) documented; legacy Wix routes; file/download URL semantics and private proxy; admin/API/auth exclusions; canonical/SEO target; sitemap/canonical consistency.

## Activation boundary

Activation requires owner row decision, target version, source/destination evidence, DNS/domain scope, approved batch, backup/rollback evidence, explicit production mutation authorization, operator, observation window, and no-go review. Apply in a small resumable batch; record before/after state and correlation identity. Never infer activation from `accepted_out_of_scope`.

## Verification and rollback

Check GET and HEAD where applicable, exact location, single hop, status, query behavior, encoded path, no cache poisoning/open redirect, logs without raw sensitive paths, sitemap/canonical, and representative SEO cases. Roll back on loops/chains, wrong/broken/private destination, elevated errors, unexpected query loss, domain mismatch, privacy exposure, owner no-go, or loss of Wix fallback. Retain sanitized manifest/evidence hashes and operator/time outside secret-bearing artifacts.

Owner decision:

Approved redirect count:

Mutation authorization:

Operator/window:

Rollback operator:
