# March Out For Love — Phase 11 Automated Testing and CI

Date: 2026-07-29 (Asia/Taipei)

## 1. Baseline

- Branch baseline: `main` at `81a6add79fa2d8d42f8c5d85900222156a7d1c7c` (`docs: align greenfield release guidance`).
- Phase 10 is complete and tagged `phase-10-editorial-release-operations-complete`.
- Production remains the greenfield Vercel SSR application at `https://marchout-website.vercel.app`.
- The existing Phase 5–10 smoke, migration, privacy, redirect, backup, and production synthetic checks remain authoritative regression assets.
- Phase 11 does not mutate production data and does not require credentials in pull-request CI.

## 2. Goal

Turn the existing release checks into a repeatable, secret-safe quality system:

1. add Nuxt-aware static analysis without broad formatting churn;
2. add fast unit and component tests for high-risk pure rules and reusable UI contracts;
3. enforce an explicit initial coverage floor over the selected testable core;
4. add a built SSR integration smoke for public, health, admin-cache, error, and security-header contracts;
5. scan tracked repository content for secrets, private artifacts, unsafe workflow triggers, and mutable action references;
6. fail pull requests on high or critical production dependency vulnerabilities;
7. retain protected remote smoke and hourly production synthetic monitoring from Phase 10;
8. make all gates reproducible from a frozen pnpm lockfile on Node 24.

## 3. Non-goals

- No production database or Storage mutation.
- No editorial publication, redirect activation, DNS, or Wix work.
- No full browser matrix or authenticated production write E2E in untrusted CI.
- No unrelated redesign, content rewrite, framework major-version migration, or repository-wide style reformat.
- No claim that the initial curated coverage scope represents whole-application coverage.

## 4. Test architecture

### 4.1 Static analysis

- Use ESLint flat config with the Nuxt-maintained shared configuration.
- Treat warnings as failures.
- Ignore generated, private, migration-cache, and coverage output.
- Disable only rules that conflict with the existing page naming convention or demand non-functional churn; retain correctness and Vue safety rules.

### 4.2 Unit tests

Test deterministic domain and security helpers in Node:

- slug normalization and URL allow-listing;
- CSV escaping;
- file-size formatting;
- administrator invitation, UUID, audit filter, and cursor parsing;
- activity and core-content validation;
- privacy derivative inspection;
- operational path hashing and route-template redaction.

### 4.3 Component tests

Use Vue Test Utils with `happy-dom` for reusable interaction contracts:

- buttons and disabled state;
- search input labeling and model updates;
- category tab pressed state and selection;
- empty-state accessible content.

### 4.4 Coverage

- Collect coverage only for the explicitly listed pure core modules.
- Enforce at least 90% statements, 85% branches, 90% functions, and 90% lines.
- Emit text, JSON summary, and HTML reports.
- Expand the measured module list only together with meaningful tests.

### 4.5 Built SSR integration

After `pnpm build`, start the generated Nitro server on loopback with mock content and verify:

- liveness and readiness JSON;
- key public pages, `robots.txt`, and `sitemap.xml`;
- public/private cache policy;
- security headers and request IDs;
- administrator login availability;
- real 404 behavior with no stack or credential leakage.

The runner must terminate its child process on success or failure and must not contact or mutate Supabase.

## 5. Repository and supply-chain gates

- Reject tracked environment files other than `.env.example`.
- Reject tracked private/cache/build/coverage paths.
- Reject common private-key, GitHub token, live payment key, and Supabase service-role JWT signatures.
- Reject `pull_request_target`.
- Require third-party GitHub Actions to use a full 40-character commit SHA.
- Require the package-manager declaration, lockfile, Phase 11 specification, tests, and workflow.
- Run `pnpm audit --prod --audit-level high`.
- Use narrow pnpm overrides only for patched transitive packages, then prove typecheck, tests, and production build.
- Configure Dependabot for pnpm and GitHub Actions maintenance.

## 6. CI topology

### Pull requests and `main`

1. checkout with least-privilege token permissions;
2. Node 24 and Corepack;
3. `pnpm install --frozen-lockfile`;
4. repository verification and manifest determinism;
5. lint and dependency audit;
6. unit/component coverage;
7. Nuxt typecheck;
8. Phase 10 static/privacy/redirect regression;
9. production build;
10. built SSR integration smoke;
11. clean-diff check and coverage artifact upload.

Public pull requests also receive GitHub dependency review. No pull-request job receives Supabase or administrator secrets.

### Schedule and protected dispatch

- Preserve the hourly read-only production synthetic.
- Preserve the protected `staging` environment gate for authenticated read-only smoke.
- Never expose protected credentials to fork pull requests.

## 7. Stop conditions

Stop and report rather than weaken a gate when:

- a required test reveals a product defect outside safe Phase 11 scope;
- production dependency audit retains a high or critical vulnerability with no compatible patch;
- a required external protected secret or repository setting is unavailable;
- integration testing would require remote mutation;
- the frozen lockfile cannot reproduce installation.

## 8. Definition of Done

- [x] `codexSteps/phase11.md` is committed.
- [x] Frozen install passes on Node 24.
- [x] Repository/security verification passes.
- [x] ESLint passes with zero warnings.
- [x] Unit and component tests pass.
- [x] Curated coverage thresholds pass.
- [x] Typecheck and production build pass.
- [x] Phase 10 regression suite passes.
- [x] Built SSR integration contract passes.
- [x] Production dependency audit has zero high and zero critical findings.
- [x] GitHub Actions use immutable full commit SHAs and least privilege.
- [x] Dependabot configuration is present.
- [x] Phase 11 execution status records exact results and remaining risk.

## 9. Deliverables

- `eslint.config.mjs`
- `vitest.config.ts`
- `tests/unit/**`
- `tests/components/**`
- `scripts/phase11/verify-repository.mjs`
- `scripts/phase11/local-ssr-smoke.mjs`
- `.github/workflows/phase11-quality.yml`
- `.github/dependabot.yml`
- `outputs/phase-11-execution-status.md`

## 10. Next-phase boundary

The old Phase 12–14 rolling roadmap was partially or fully pulled forward into Phase 10: deployment hardening, backup/monitoring/operations, production launch, and the greenfield Wix decision are already complete. Phase 12 must therefore be re-baselined from the post-Phase 11 product priorities instead of repeating those completed operations.
