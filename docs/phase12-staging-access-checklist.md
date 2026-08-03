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

## Current verified GitHub `staging` environment

Verified inventory on 2026-07-31:

- The legacy Phase 10 variable and secret names have been removed.
- The staging/production Supabase comparison variables, staging public key,
  staging-only service-role key, and both staging identity pairs are present
  under the exact Phase 12 names below.
- Independent staging Vercel URL/project/token names are configured.
- No required reviewer blocks the pre-merge matrix. Owner approval is obtained
  only after `90/90`, cleanup, residual-zero, and artifact evidence succeeds.
- The deployment branch policies are `main` and the exact Phase 12 branch
  `codex/phase12-e2e-staging-release-hardening`.
- Actual values remain outside Git, PR text, Markdown, logs, and artifacts.

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
| `PHASE12_PR_NUMBER` | Explicit dispatch input for pre-merge staging | Require an open Draft PR whose head equals the release SHA |
| `PHASE12_STAGING_APPROVAL_ISSUE` | Explicit dispatch input for protected-main staging only | Owner staging-authorization evidence |
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

## Verified Vercel staging inventory

The dedicated `marchout-staging` project and canonical
`https://marchout-staging.vercel.app` origin are configured and distinct from
production. The project has its own project identity and deployment credential.
It receives only staging public runtime values. It does not receive a Supabase
service-role key, database password, production administrator credential, or
production runtime value.

## Verified Supabase staging inventory

A separate staging project is linked and proven distinct from production. All
eleven tracked migrations align locally and remotely. The three required
buckets are private, tracked policies are present, one dedicated active-admin
identity has exactly one active mapping, and one dedicated non-admin has none.
Site and redirect URLs use the independent Vercel staging canonical origin.
Credentials remain in platform secret stores; database credentials are not
required by the browser workflow.

## Ordered execution for the Draft PR exact head

No step below is authorized by this document. Stop immediately on any origin,
project, identity, check, cleanup, or SHA mismatch.

1. Re-read the Vercel project ID, canonical staging origin, Supabase project
   ref, and production comparison references.
2. Run `pnpm run phase12:verify-staging`; require different web origins,
   different Supabase origins, no production redirect, `environment=staging`,
   the exact candidate SHA, and readiness `200`.
3. Confirm the eleven tracked migrations remain LOCAL／REMOTE aligned and rerun
   the read-only SQL/RLS/policy/grant/function verification set. Do not proceed
   on any false invariant.
4. Confirm the active-admin and non-admin staging identities and their opposite
   authorization results.
5. Confirm `activity-assets`, `content-assets`, and `downloads` are private and
   their policies match the tracked migrations.
6. Deploy the Draft PR exact head to the dedicated staging Vercel project and
   repeat the origin/Supabase/release-SHA verification.
7. Run `pnpm run phase12:seed` with the staging-only service role and
   run-scoped namespace.
8. Run the full staging Playwright matrix: Chromium `27`, Firefox `21`,
   WebKit `21`, Mobile Chromium `21`; require `90/90` passed, `0` skipped,
   `0` failed, and `0` flaky.
9. Run `pnpm run phase12:staging-result` and
   `pnpm run phase12:scan-artifacts`; require secret findings `0`.
10. Run `pnpm run phase12:cleanup` even after a browser failure.
11. Verify fixture rows, asset rows, and exact Storage objects are all `0`.
    Repeat cleanup once to prove idempotency.
12. Record owner PR acceptance for the tested PR SHA and evidence; only then
    convert PR `#12` from Draft to Ready.
13. Merge through protected `main`; do not bypass branch protection. Record the
    resulting final-main SHA.
14. Require final-main `quality`, `phase12-quality`, `dependency-review`, and
    `Vercel` checks to succeed.
15. Because the protected staging workflow requires the exact current
    `origin/main` SHA, record
    `PHASE12-STAGING-APPROVED <final-main-sha>` in an issue labeled
    `phase12-staging-approved`, then dispatch the full staging workflow for that
    exact SHA. This is a second, mandatory unchanged-release staging run; the
    pre-merge result cannot substitute for final-main evidence.
16. Require the final-main staging workflow, cleanup, residual `0`, artifact
    scan, and machine-readable result to succeed.
17. Record `PHASE12-APPROVED <final-main-sha>` in an issue labeled
    `phase12-release-approved`.
18. Dispatch production promotion with the exact final-main SHA, successful
    final-main staging run ID, and approval issue number.
19. Run credential-free and authenticated read-only production smoke only.
20. Verify production content mutation count is `0` and staging credentials
    were absent from production jobs.
21. Commit the Phase 12 completion report only after every Definition of Done
    item above has evidence.
22. Create and push the annotated completion tag only after the report,
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
