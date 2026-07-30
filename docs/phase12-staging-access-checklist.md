# Phase 12 staging access and least-privilege checklist

This document is preparation only. It does not authorize a deployment, migration,
identity change, secret change, merge, or production operation.

## Required state until full staging evidence exists

- Keep PR `#12` in Draft.
- Keep `codex/phase12-e2e-staging-release-hardening` pushed and clean.
- Do not use the production Vercel project, production canonical origin,
  production Supabase project, production Auth identities, or production data as
  staging substitutes.
- Do not mark staging-only tests as optional, remove their skip guards, inject
  mock authentication, weaken origin/project checks, or accept a matrix with
  skipped tests.
- Do not create a Phase 12 completion report or completion tag.

## Current GitHub `staging` environment

Verified inventory on 2026-07-31:

- The legacy Phase 10 variable and secret names have been removed.
- The staging/production Supabase comparison variables, staging public key,
  staging-only service-role key, and both staging identity pairs are present
  under the exact Phase 12 names below.
- One owner required reviewer is configured.
- The only deployment branch policy is `main`.
- Vercel staging URL/project/token values remain unset until the independent
  Vercel project is created and verified.

## GitHub `staging` environment contract

All values in this table belong in the GitHub `staging` environment, not in the
repository, PR variables, workflow-dispatch inputs, logs, or artifacts.

| GitHub name | Platform source | Secret | Workflow jobs | Reject when |
| --- | --- | --- | --- | --- |
| `PHASE12_STAGING_BASE_URL` | Dedicated staging alias/domain from the staging Vercel project | No | `deploy-staging`, `verify-staging`, `seed`, `browser-e2e`, `cleanup` | Not HTTPS; same origin as `PHASE12_PRODUCTION_BASE_URL`; contains the production canonical host; or any redirect reaches production |
| `PHASE12_PRODUCTION_BASE_URL` | Approved production canonical URL from the production Vercel project | No | `verify-staging`, `seed`, `cleanup`; comparison only | Blank or not the actual production reference. It must never become a request or mutation target in staging |
| `PHASE12_STAGING_SUPABASE_URL` | Staging Supabase project Settings → API project URL | No | `deploy-staging`, `verify-staging`, `seed`, `cleanup` | Project ref/origin equals production; URL is not the dedicated staging project |
| `PHASE12_PRODUCTION_SUPABASE_URL` | Production Supabase project Settings → API project URL | No | `verify-staging`, `seed`, `cleanup`; comparison only | Blank or not the actual production reference. It must never be used to create a staging client |
| `PHASE12_VERCEL_ORG_ID` | Staging Vercel project metadata (`orgId`) | No | `deploy-staging` | Does not own the dedicated staging project. The organization may be shared, but this value alone does not prove isolation |
| `PHASE12_VERCEL_PROJECT_ID` | Dedicated staging Vercel project metadata (`projectId`) | No | `deploy-staging` | Equals the production Vercel project ID or resolves to the production project |
| `PHASE12_VERCEL_TOKEN` | Vercel token for the dedicated staging deployment identity | Yes | `deploy-staging` only | Same credential used by production release, production-only principal, excessive account scope without an approved exception, or cannot deploy/alias only the intended staging project |
| `PHASE12_STAGING_SUPABASE_ANON_KEY` | Staging Supabase project Settings → API anon/publishable credential | Yes in GitHub | `deploy-staging` only; becomes the staging app public runtime key | Equals the production key, belongs to another project, or its project cannot be proven to match `PHASE12_STAGING_SUPABASE_URL` |
| `PHASE12_STAGING_SUPABASE_SERVICE_ROLE_KEY` | Staging Supabase project Settings → API service-role credential | Yes, high privilege | `seed` and `cleanup` only | Production key; wrong project; present in deploy/browser jobs, Vercel runtime, repository, logs, reports, traces, or artifacts |
| `PHASE12_ADMIN_EMAIL` | Dedicated active-admin user created in staging Supabase Auth | Yes | `seed`, `browser-e2e`, `cleanup` | Reuses a production identity, does not belong to staging Auth, or lacks exactly one active staging `admin_users` authorization |
| `PHASE12_ADMIN_PASSWORD` | Random password set only for the dedicated staging admin | Yes | `seed`, `browser-e2e`, `cleanup` | Reused from production, committed, logged, or shared with the non-admin identity |
| `PHASE12_NON_ADMIN_EMAIL` | Dedicated ordinary user created in staging Supabase Auth | Yes | `browser-e2e` only | Reuses a production identity or has an active staging `admin_users` authorization |
| `PHASE12_NON_ADMIN_PASSWORD` | Random password set only for the dedicated staging non-admin | Yes | `browser-e2e` only | Reused from production, committed, logged, or shared with the admin identity |

Workflow-generated values require no GitHub configuration:

| Name | Source | Use |
| --- | --- | --- |
| `PHASE12_RELEASE_SHA` | Explicit dispatch input or scheduled workflow SHA | Exact candidate traceability |
| `PHASE12_STAGING_APPROVAL_ISSUE` | Explicit dispatch input | Owner staging-authorization evidence |
| `PHASE12_E2E_RUN_ID` | GitHub `run_id-run_attempt` | Fixture namespace |
| `PHASE12_MUTATION_TARGET=staging` | Workflow constant | Mutation fail-closed guard |
| `PHASE12_STAGING_ISOLATION_CONFIRMED=true` | Workflow constant after isolation job | Mutation fail-closed guard |
| `PHASE12_SEEDED_ASSET_ID` | `seed` job output | Browser private-asset assertion |

## Production environment values are separate

These names belong only in the GitHub `production` environment and must not be
copied into `staging`:

- Variables: `PHASE12_PRODUCTION_BASE_URL`,
  `PHASE12_PRODUCTION_SUPABASE_URL`,
  `PHASE12_PRODUCTION_VERCEL_ORG_ID`,
  `PHASE12_PRODUCTION_VERCEL_PROJECT_ID`.
- Secrets: `PHASE12_PRODUCTION_VERCEL_TOKEN`,
  `PHASE12_PRODUCTION_SUPABASE_ANON_KEY`,
  `PHASE12_PRODUCTION_READONLY_EMAIL`,
  `PHASE12_PRODUCTION_READONLY_PASSWORD`.

The duplicate production URL variables in `staging` are non-secret comparison
references only. No production token, production password, production
service-role key, or production mutation credential is accepted by a staging
job.

## Vercel operator checklist

The authorized Vercel operator must:

1. Create a dedicated staging project rather than reuse
   `marchout-website`.
2. Connect it to `Jacob0710/marchoutWebsite` without changing the production
   project connection.
3. Assign a dedicated HTTPS staging alias that cannot canonicalize or redirect
   to `https://marchout-website.vercel.app`.
4. Record the staging `orgId`, staging `projectId`, and canonical staging URL.
5. Create or authorize a staging deployment identity/token with the minimum
   practical scope; do not supply the production release token.
6. Do not add the Supabase service-role key, database password, production
   admin credentials, or production Supabase values to the Vercel project.
7. Authorize Codex or the repository operator to place only the approved
   Phase 12 values into the GitHub `staging` environment.

## Supabase operator checklist

The authorized Supabase operator must:

1. Create a separate staging project. The current verifier requires a distinct
   Supabase origin/project ref; a production schema or production dataset is
   not accepted.
2. Record the staging project URL, anon/publishable credential, and
   service-role credential without placing their values in chat, Git, logs, or
   reports.
3. Provide a trusted database-owner path for applying the eleven ordered files in
   `supabase/migrations/`.
4. Confirm these buckets exist and remain private:
   `activity-assets`, `content-assets`, and `downloads`.
5. Confirm the tracked Storage policies, RLS, grants, and fixed-search-path
   functions were created by the migrations; do not add blanket public or
   authenticated-write policies.
6. Create a dedicated staging active-admin Auth user and the corresponding
   active `admin_users` row through the trusted bootstrap procedure.
7. Create a dedicated staging non-admin Auth user with no active
   `admin_users` row.
8. Add only the exact staging site and invitation/auth callback URLs.
9. Authorize the GitHub `staging` secrets listed above. A database URL/password
   or Auth Admin credential is not required by the workflows.

## Ordered execution after access is granted

No step below is authorized by this document. Stop immediately on any origin,
project, identity, check, cleanup, or SHA mismatch.

1. Re-read the Vercel project ID, canonical staging origin, Supabase project
   ref, and production comparison references.
2. Run `pnpm run phase12:verify-staging`; require different web origins,
   different Supabase origins, no production redirect, `environment=staging`,
   the exact candidate SHA, and readiness `200`.
3. Take the staging-only database/Storage checkpoint required by the migration
   runbook.
4. Apply the eleven tracked staging migrations in the exact order documented in
   `supabase/README.md`; record operator, project ref, filename, commit,
   timestamp, and result.
5. Run the six read-only SQL verification files in documented order. Do not
   proceed on any false invariant.
6. Confirm the active-admin and non-admin staging identities and their opposite
   authorization results.
7. Confirm `activity-assets`, `content-assets`, and `downloads` are private and
   their policies match the tracked migrations.
8. Deploy the PR head to the dedicated staging Vercel project and repeat the
   origin/Supabase/release-SHA verification.
9. Run `pnpm run phase12:seed` with the staging-only service role and
   run-scoped namespace.
10. Run the full staging Playwright matrix: Chromium `27`, Firefox `21`,
    WebKit `21`, Mobile Chromium `21`; require `90/90` passed, `0` skipped,
    `0` failed, and `0` flaky.
11. Run `pnpm run phase12:staging-result` and
    `pnpm run phase12:scan-artifacts`; require secret findings `0`.
12. Run `pnpm run phase12:cleanup` even after a browser failure.
13. Verify fixture rows, asset rows, and exact Storage objects are all `0`.
    Repeat cleanup once to prove idempotency.
14. Record owner PR acceptance for the tested PR SHA and evidence; only then
    convert PR `#12` from Draft to Ready.
15. Merge through protected `main`; do not bypass branch protection. Record the
    resulting final-main SHA.
16. Require final-main `quality`, `phase12-quality`, `dependency-review`, and
    `Vercel` checks to succeed.
17. Because the protected staging workflow requires the exact current
    `origin/main` SHA, record
    `PHASE12-STAGING-APPROVED <final-main-sha>` in an issue labeled
    `phase12-staging-approved`, then dispatch the full staging workflow for that
    exact SHA. This is a second, mandatory unchanged-release staging run; the
    pre-merge result cannot substitute for final-main evidence.
18. Require the final-main staging workflow, cleanup, residual `0`, artifact
    scan, and machine-readable result to succeed.
19. Record `PHASE12-APPROVED <final-main-sha>` in an issue labeled
    `phase12-release-approved`.
20. Dispatch production promotion with the exact final-main SHA, successful
    final-main staging run ID, and approval issue number.
21. Run credential-free and authenticated read-only production smoke only.
22. Verify production content mutation count is `0` and staging credentials
    were absent from production jobs.
23. Commit the Phase 12 completion report only after every Definition of Done
    item above has evidence.
24. Create and push the annotated completion tag only after the report,
    production evidence, final-main CI, clean worktree, and remote SHA all
    agree.

## Stop conditions

Do not continue when any of the following is true:

- staging and production web origins or Supabase project refs match;
- the staging alias redirects to production;
- the staging Vercel project ID equals the production project ID;
- a staging identity or password is reused from production;
- the service role reaches a deploy or browser job;
- any staging-only Playwright case is skipped;
- cleanup or residual verification is non-zero;
- the tested SHA differs from the candidate, PR, final-main, or promotion SHA
  expected at that step;
- owner approval is missing or refers to another SHA;
- a required check is pending, skipped, cancelled, or failed.
