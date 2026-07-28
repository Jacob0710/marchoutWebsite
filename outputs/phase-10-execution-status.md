# Phase 10 execution status

Date: 2026-07-29 (Asia/Taipei)
Status: **COMPLETE**

This report records the completed Phase 10 release state. The application, production database migration, conservative editorial reconciliation, backup/restore rehearsal, Vercel SSR deployment, production validation, GitHub merge, and release reconciliation are complete. On 2026-07-29 the project owner confirmed that this is a greenfield website: Wix is a historical content source only, and no Wix hostname, DNS cutover, or legacy redirect is required.

## 1. Release identity

- Repository: `C:\Users\Admin\Documents\BuildWeb\marchoutWebsite`
- Phase 9 baseline: `0784b22893ba2cf8cc2505536c079a6e2d7dd217`
- Baseline tag: `phase-9-wix-content-migration-complete`
- Release-candidate commit deployed to production: `8404531122867ea26d1f759e2f3e52285a69b55e`
- Phase 10 squash merge commit: `37b84ac3dfab708c1a8a41b93bfb91ea66e9332a`
- Release branch: `codex/phase10-release`
- Merged pull request: `https://github.com/Jacob0710/marchoutWebsite/pull/1`
- Completion tag: `phase-10-editorial-release-operations-complete`
- Phase specification: `codexSteps/phase10.md`
- Phase document convention: lowercase `phase<number>.md` files directly under `codexSteps/`

## 2. Production deployment

- Hosting: Vercel Hobby (free), Nuxt/Nitro SSR
- Project: `marchout-website`
- Production URL: `https://marchout-website.vercel.app`
- Initial validated production deployment ID: `Atb8SggaF1oh6moiyDcvEdcyfnX3`
- Post-merge Vercel deployment check ID: `3rBpXZ5d1EZHsyDkQf6wduSKg53r`
- Production state: Ready
- Preview deployment ID: `BZySwTweBi64PscumEFRbJWqgd83`
- GitHub checks on deployed commit:
  - Phase 10 quality: passed
  - Vercel deployment: passed
  - Vercel preview comments: passed
  - Scheduled production synthetic and protected manual release gate: correctly skipped for the pull-request event

The production synthetic suite passed `/api/health`, `/api/health/ready`, `/`, `/about`, `/activities`, `/files`, `/years`, `/robots.txt`, and `/sitemap.xml`. The slowest recorded request was 4,072 ms, below the configured 5,000 ms threshold.

After the Phase 10 merge deployed, the same nine production endpoints passed again with zero mutations; the slowest recorded response was 3,198 ms. The post-merge anonymous, non-admin, and active-admin read-only smoke also passed with zero remote mutations.

## 3. Final conservative editorial state

| Scope | Published / active | Keep draft / inactive | Archive |
| --- | ---: | ---: | ---: |
| 70 imported targets | 0 | 70 | 0 |
| 29 structural redirects | 0 | 29 | 0 |
| 52 draft-target redirects | 0 | 52 | 0 |
| 2 utility routes | 0 | 0 | 2 |

- All 70 imported targets have explicit deferred/keep-draft decisions.
- All 52 draft-target redirect reviews have explicit deferred/keep-inactive decisions.
- All 29 structural redirects remain intentionally inactive as historical mappings under the greenfield scope.
- Forty high-severity reviews remain explicitly deferred.
- The unrelated pre-existing Activity draft was not included in the 70-target Phase 9 editorial set.

## 4. Database, backup, and restore evidence

- Production migrations applied: `20260722_001`, `20260722_002`, and redirect-review hotfix `20260722_003`.
- Production bootstrap reconciled 70 targets, 378 assets, 83 redirects, and 122 reviews.
- Conservative decision apply completed all 153 operations; a second apply was idempotent with zero new operations.
- Recoverable checkpoint: `phase10-20260722110127-bf80b623`.
- Database dump: 530,088 bytes; SHA-256 `b8174d7fa35a82db2f25b6d0d7db7783139b15ae50570ec70b4f155dc2e90ee0`.
- Storage inventory: 378 objects, 120,109,005 bytes; SHA-256 `d71fc3afb7fd4c05b4193189c6c6fbea8c66b8200bc58b2a795b2a6ad1190a45`.
- Application-scope isolated restore rehearsal passed; evidence SHA-256 `b5d3c9893264565b1ea9a0a0f56f986d0e3a2d79b436511ea0a523a39f404c55`.
- The restored database passed Phase 8, Phase 9, and Phase 10 migrations and verification.

## 5. Production validation

- `pnpm test:phase10`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed; only the documented dependency deprecation warning remains.
- Production read-only smoke: passed for anonymous, non-admin, and active-admin roles.
- Remote smoke mutation count: zero.
- RLS/grants, editorial queue/detail, same-origin protection, draft/admin private-asset proxy, headers/cache, and logout checks: passed.
- Redirect configuration: 83 rows, 29 structural candidates, 52 inactive draft mappings, 2 archived utility routes, 0 active rules, 0 unauthorized `410`, and 0 duplicates.
- All six unique Vercel targets referenced by the 29 structural candidates respond directly with HTTP 200.
- Desktop production check: one visible `h1`, complete image alternative text, `lang="zh-Hant"`, no horizontal overflow, and no console errors or warnings.
- Mobile 390 × 844 check: one visible `h1`, complete image alternative text, accessible menu label, no horizontal overflow, and no console errors or warnings.
- Mobile administrator login: correct email/password labels and autocomplete attributes, no overflow, and no console errors.
- Storage reconciliation: zero orphan and zero missing objects.
- Secret/privacy scans passed; private runtime evidence remains ignored.

## 6. Monitoring and operations

- GitHub Actions quality workflow is installed.
- Hourly production synthetic schedule: `17 * * * *`.
- Production synthetic origin: `https://marchout-website.vercel.app`.
- Protected manual release gate uses the `staging` GitHub environment.
- Monitoring owner: `Jacob0710`.
- Backup/restore, editorial release, deployment, incident monitoring, and rollback runbooks are present.

## 7. Greenfield scope decision and Wix cleanup

- Authoritative legacy site: `https://a0903080125.wixsite.com/website`
- Wix site ID: `06e8ea3e-f44b-4c0a-b8e9-a8cd44088952`
- The project owner explicitly confirmed that the Vercel application is a new standalone website and does not require Wix redirection.
- Wix remains a provenance source only; no DNS, domain, hosting, or runtime dependency connects it to the new site.
- The one `/website` redirect that had been added during operator exploration was deleted on 2026-07-29.
- Wix Redirect Manager was verified at zero redirects after deletion.
- The 29 structural candidates and 52 draft-target mappings remain inactive in the application manifest for historical reconciliation only.
- Static redirect verification passed with 83 records, 0 active, 0 duplicate, 0 unauthorized `410`, and no public draft disclosure.

## 8. Release decision

- Vercel production: **READY**
- Application, database, security, backup/restore, and monitoring implementation: **READY**
- Wix redirect activation: **NOT IN SCOPE — greenfield site decision**
- Redirect reconciliation: **READY — 83 explicit fail-closed decisions**
- Overall Phase 10: **COMPLETE**
- Pull request: merged to `main`
- Completion tag: `phase-10-editorial-release-operations-complete`
- Final completion evidence commit: the commit containing this report and targeted by the completion tag
- Local `main`, `origin/main`, local tag target, and remote tag target are required to match in the final release verification

The Canva website architecture diagram is produced after this completed release verification as a separate design deliverable.
