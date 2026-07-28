# Phase 10 execution status

Date: 2026-07-28 (Asia/Taipei)
Status: **RELEASE CANDIDATE — production deployment verification in progress**

This report records the current Phase 10 release-candidate state. The implementation, database migration, conservative editorial reconciliation, recoverable backup, and restore rehearsal are complete. The completion tag remains intentionally absent until the GitHub/Vercel release, production checks, monitoring workflow, and final clean-tree verification pass.

## 1. Baseline and scope

- Repository: `C:\Users\Admin\Documents\BuildWeb\marchoutWebsite`
- Phase 9 baseline: `0784b22893ba2cf8cc2505536c079a6e2d7dd217`
- Baseline tag: `phase-9-wix-content-migration-complete`
- Phase specification: `codexSteps/phase10.md`
- Phase document convention: lowercase `phase<number>.md` files directly under `codexSteps/`

The Phase 10 worktree contains only the reviewed editorial workflow, release safety, redirect, security, operations, verification, and documentation scope.

## 2. Final conservative editorial state

| Scope | Published / active | Keep draft / inactive | Archive |
| --- | ---: | ---: | ---: |
| 70 imported targets | 0 | 70 | 0 |
| 29 structural redirects | 0 | 29 | 0 |
| 52 draft-target redirects | 0 | 52 | 0 |
| 2 utility routes | 0 | 0 | 2 |

- All 70 imported targets have an explicit deferred/keep-draft decision.
- All 52 draft-target redirect reviews have an explicit deferred/keep-inactive decision.
- All 29 structural candidates remain inactive until the deployed-hostname check is complete.
- Forty high-severity reviews remain deferred.
- The unrelated pre-existing Activity draft was not included in the 70-target Phase 9 editorial set.

## 3. Database, backup, and restore evidence

- Production migrations applied: `20260722_001`, `20260722_002`, and redirect-review hotfix `20260722_003`.
- Production bootstrap reconciled 70 targets, 378 assets, 83 redirects, and 122 reviews.
- Conservative decision apply completed all 153 operations; second apply was idempotent with zero new operations.
- Recoverable checkpoint: `phase10-20260722110127-bf80b623`.
- Database dump: 530,088 bytes; SHA-256 `b8174d7fa35a82db2f25b6d0d7db7783139b15ae50570ec70b4f155dc2e90ee0`.
- Storage inventory: 378 objects, 120,109,005 bytes; SHA-256 `d71fc3afb7fd4c05b4193189c6c6fbea8c66b8200bc58b2a795b2a6ad1190a45`.
- Application-scope isolated restore rehearsal passed; evidence SHA-256 `b5d3c9893264565b1ea9a0a0f56f986d0e3a2d79b436511ea0a523a39f404c55`.
- Restored database passed Phase 8, Phase 9, and Phase 10 migrations and verification.

## 4. Delivered implementation

- Private editorial targets, review queue, redirect state, release batches, safety checkpoints, audit trail, guarded RPCs, RLS, and grants.
- Administrator review queue/detail UI and same-origin APIs.
- Explicit, resumable, version-checked release dry-run/apply/verify/second-apply/rollback tooling.
- Private Storage proxy validation and non-destructive redacted-derivative workflow.
- Deterministic 83-row redirect configuration with fail-closed activation requirements.
- Health/readiness endpoints, redacted operational logging, security headers, cache policy, robots, sitemap, canonical URLs, and error handling.
- Backup/restore, editorial release, deployment, incident monitoring, and rollback runbooks.
- GitHub quality workflow plus hourly production synthetic checks for the free Vercel deployment.

## 5. Validation completed

- `pnpm test:phase10` passed.
- `pnpm typecheck` passed.
- Production `pnpm build` passed; only the documented dependency deprecation warning remains.
- Production Phase 8–10 database verification passed.
- Storage reconciliation passed with zero orphan and zero missing objects.
- Backup restore verification passed against the isolated PostgreSQL restore.
- Conservative decisions passed dry-run, full apply/resume, and second-apply idempotency.
- Redirect configuration passed static verification with 83 rows, zero active rules, zero unauthorized `410`, zero duplicate, and two archived utility routes.
- Secret/privacy scans passed; private runtime evidence remains ignored.

## 6. Release gates still being executed

1. Push the reviewed candidate branch to GitHub.
2. Verify the Vercel preview deployment and public/admin production matrix.
3. Promote the verified artifact to `https://marchout-website.vercel.app`.
4. Run production health, readiness, synthetic, security/cache, canonical, robots, sitemap, and redirect checks.
5. Confirm the GitHub Actions quality and hourly monitoring workflow on the pushed Phase 10 revision.
6. Update this report with final deployment, commit, tag, and reconciliation evidence.
7. Merge the reviewed release to `main`, create the annotated completion tag only if all Definition of Done gates pass, fetch, and verify local/remote hashes and a clean worktree.

The legacy Wix hostname `a0903080125.wixsite.com` is externally hosted. Its ownership and any redirect-manager changes must be evidenced separately from the Vercel deployment; no unverified Wix-host redirect is claimed by this release candidate.
