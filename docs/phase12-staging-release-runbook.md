# Phase 12 isolated staging and release runbook

This runbook is the operator contract for `.github/workflows/phase12-staging-e2e.yml` and `.github/workflows/phase12-production-release.yml`. It never permits production credentials or production data in staging.

Use `docs/phase12-staging-access-checklist.md` for the per-value source,
secret scope, job scope, rejection rules, operator authorization requests, and
the full pre-merge/final-main execution order.

## Required topology

| Boundary | Staging | Production |
| --- | --- | --- |
| Web origin | Dedicated HTTPS canonical origin | `https://marchout-website.vercel.app` or the approved successor |
| Vercel project | Dedicated project ID and alias | Production project ID |
| Supabase | Separate project reference, database, Auth and Storage | Existing production project |
| Identities | Dedicated active admin and valid non-admin | Dedicated read-only synthetic administrator |
| Mutation | Namespaced `e2e-phase12-<run-id>-*` only | Forbidden |

The staging health response must return `environment: staging` and the exact requested 40-character `releaseSha`. The staging and production origins and Supabase origins must differ.

## GitHub `staging` environment

Configure the following names without copying values into Git:

Variables:

- `PHASE12_STAGING_BASE_URL`
- `PHASE12_PRODUCTION_BASE_URL`
- `PHASE12_STAGING_SUPABASE_URL`
- `PHASE12_PRODUCTION_SUPABASE_URL`
- `PHASE12_VERCEL_ORG_ID`
- `PHASE12_VERCEL_PROJECT_ID`

Secrets:

- `PHASE12_VERCEL_TOKEN`
- `PHASE12_STAGING_SUPABASE_ANON_KEY`
- `PHASE12_STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `PHASE12_ADMIN_EMAIL`
- `PHASE12_ADMIN_PASSWORD`
- `PHASE12_NON_ADMIN_EMAIL`
- `PHASE12_NON_ADMIN_PASSWORD`

The service role is injected only into the seed and cleanup jobs. It is
prohibited in deployment verification and browser jobs. Deployment branch
policies permit only protected `main` and the exact Phase 12 PR branch. A
required reviewer must not block the pre-merge matrix because owner approval
occurs after `90/90`, cleanup, residual-zero, and artifact evidence.

Create the dedicated staging active-admin row through the trusted administrator bootstrap procedure. Create the non-admin Auth user without an active `admin_users` authorization row. Neither email may equal a production identity.

Apply all tracked migrations to staging in filename order, create the three private buckets, run the SQL verification set, and add the exact staging invitation/auth callback URLs. Do not restore production personal content merely to satisfy a browser assertion; Phase 12 browser fixtures are deterministic.

## Pre-merge Draft PR staging execution

Dispatch **Phase 12 isolated staging E2E** from
`codex/phase12-e2e-staging-release-hardening` with:

- `release_sha`: the exact 40-character Draft PR head;
- `pull_request`: `12`;
- `approval_issue`: empty.

The verifier requires PR `#12` to remain open and Draft, target `main`, match the
exact release SHA, and have successful `quality`, `phase12-quality`, and
`Vercel` checks. Pre-merge staging deliberately does not accept or require
owner approval before the matrix.

## Protected-main staging execution

Before dispatch, create or reuse an issue with label `phase12-staging-approved`; the repository owner must post the exact marker `PHASE12-STAGING-APPROVED <40-character-release-sha>`. This is the repository-verifiable substitute when the GitHub plan does not provide environment required reviewers.

Dispatch **Phase 12 isolated staging E2E** from protected `main` with the exact
current `main` commit SHA, an empty `pull_request`, and that approval issue
number. A scheduled run discovers a labeled issue for the current SHA and fails
closed when no matching owner marker exists.

The workflow must complete, in order:

1. exact SHA and required-check verification, plus Draft PR identity for
   pre-merge or protected-main owner approval after merge;
2. frozen install and repository/application gates;
3. isolated Vercel staging deployment and alias;
4. origin, environment, release SHA, readiness and Supabase isolation checks;
5. namespaced seed through the normal application interface;
6. Chromium full journey plus Firefox, WebKit and mobile smoke;
7. accessibility and artifact secret scan;
8. cleanup in an `always()` job;
9. zero residual fixture rows, asset rows and Storage objects;
10. a machine-readable staging result artifact.

If browser execution fails, cleanup must still run. If cleanup fails, the workflow fails and production promotion is forbidden. The runner-private `.phase12-cache` may contain exact Storage paths for cleanup evidence; it must not be uploaded.

## Approval substitute and production release

When GitHub environment reviewers are unavailable, create or reuse an issue:

1. apply label `phase12-release-approved`;
2. the repository owner posts `PHASE12-APPROVED <40-character-release-sha>`;
3. retain the successful staging workflow run ID.

Dispatch **Phase 12 production release** with the exact SHA, staging run ID and approval issue number. The workflow independently verifies that:

- the SHA equals current protected `main`;
- the referenced staging workflow and required checks succeeded for that SHA;
- the owner approval marker is exact;
- the staging result reports cleanup `0` and production mutation `0`.

Production receives only its own Vercel/public Supabase values and dedicated read-only identity. Post-deploy checks may log in, read administrator pages and log out; no content mutation endpoint is called. Do not create the Phase 12 completion tag until the final `main` CI, deployment SHA, both production smoke modes and remote synchronization are proven.

## Rollback

Application rollback redeploys the last known-good production commit through a
separately approved release. Phase 12 adds a tracked Phase 4 baseline migration
for clean-project reconstruction, but this runbook does not authorize applying,
repairing, or resetting production migrations and provides no automatic
destructive down migration. If a release check fails, stop promotion, retain
run/deployment IDs, keep production mutation count at zero, and follow
`docs/phase10-rollback-runbook.md`.
