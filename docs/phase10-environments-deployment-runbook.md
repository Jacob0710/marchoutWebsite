# Phase 10 environment and deployment runbook

Phase 10 is promoted as one reviewed code, schema, editorial-state, and redirect-config release. A local build or a Supabase administrator session does not establish production deployment authority. Unknown hostnames, project references, owners, or evidence identifiers must remain unset.

## Environment contract

| Property | Local | Staging | Production |
| --- | --- | --- | --- |
| Purpose | Build and non-mutating checks | Isolated restore, migration, smoke, Browser, rollback rehearsal | Approved public release |
| Supabase data | Mock or explicitly selected development project | Separate project or restored isolated database | Production project chosen by its owner |
| Public origin | Loopback | Exact HTTPS origin supplied by operator | Exact HTTPS origin supplied by operator |
| Admin accounts | Test only | Dedicated active/inactive test identities | Named operational identities |
| Redirects | Inactive | Candidate config, HTTP verified | Only individually approved entries |
| HSTS | Off | Off | Enable only after TLS and hostname validation |

Application runtime may contain the public Supabase URL and anon key. Database credentials are limited to the ignored backup/restore operator environment and must never enter the Nitro runtime, logs, evidence JSON, or Git.

## Required release evidence

Before any shared-environment write, record outside Git:

- environment and Supabase project reference;
- reviewed commit and immutable build artifact identifier;
- database backup identifier and SHA-256 evidence;
- private Storage inventory SHA-256;
- isolated restore rehearsal evidence SHA-256 and timestamp;
- migration versions `20260722_001` and `20260722_002`;
- editorial bootstrap/decision hashes and any release batch keys;
- redirect-config hash, canonical origin, source hosts, and HTTP evidence;
- deploy identifier, operator, reviewer, maintenance window, and rollback owner;
- monitoring evidence identifier and alert owner.

Missing evidence is a release stop, not a value to infer.

Release-plan dry-run must carry an explicit environment name. A real apply is rejected for `local`; only `staging` or `production` is valid, and the database safety checkpoint must have been registered for exactly that environment. Do not reuse a checkpoint, batch key, or HTTP evidence across environments.

## Promotion order

1. Freeze application mutations and capture the Phase 9 baseline counts.
2. Complete `docs/phase10-backup-restore-runbook.md`. Do not continue until the isolated restore rehearsal passes.
3. From a clean checkout, run `pnpm install --frozen-lockfile`, `pnpm phase10:decisions`, `pnpm test:phase10`, `pnpm typecheck`, and `pnpm build`.
4. Prepare the new artifact and enter a maintenance window. Deploy the Phase 10 application first. Before the schema is present, its public readers use the narrow Phase 9 compatibility path while managed publish operations fail closed.
5. Apply the two Phase 10 migrations in filename order. Immediately run the schema verification appropriate to the pre-bootstrap state.
6. Run the editorial bootstrap dry-run. With valid backup/restore evidence, apply it once and verify exact counts: 70 targets, 83 redirects, 122 reviews, and 378 original object references.
7. Apply the deterministic conservative decisions in checkpoints and run its second-apply check. The baseline outcome is 70 keep-draft, 0 publish, 81 keep-inactive, 2 archive, and 0 active redirects.
8. Run `supabase/verify-phase10-editorial-release.sql`, the Phase 5–9 SQL verification set, read-only Phase 10 smoke, and the full staging Browser matrix.
9. Configure uptime and synthetic monitoring, assign owners, and run `pnpm phase10:synthetic` against the exact staging origin.
10. Promote only an unchanged artifact and evidence set to production. Repeat health, headers, cache, public pages, private boundaries, and redirect HTTP verification on production.

The short code-before-schema interval intentionally blocks publish mutations. Do not reverse the order while old code still depends on direct `activity_assets` or `files` grants, because migration 001 revokes those grants.

## Redirect promotion

The tracked `migration/phase10/redirect-config.json` starts fully inactive. For each proposed activation:

1. confirm its editorial decision and target version;
2. prove the target is publicly reachable at the exact canonical HTTPS origin with a direct `200` and no redirect hop;
3. for a draft-target mapping, resolve its review with `activate-redirect` and explicit public-target evidence;
4. generate an ignored candidate and review its hash and diff;
5. promote only with the matching confirmation hash;
6. run `pnpm phase10:redirect:verify:http -- --origin=<approved-source-origin>` and retain the ignored evidence output;
7. confirm query preservation, exactly one `301`, final `200`, and no loop, chain, conflict, `404`, or unauthorized `410`.

Wix hostname or DNS changes require the external account owner. Until ownership and routing are proven, all 29 structural candidates and 52 draft-target mappings remain inactive.

## Security and cache gate

- Keep administrator, auth, mutation, health, and private asset/download responses `private, no-store`. This includes draft/not-found/error responses for activity assets, file downloads, and post/year covers; all proxy responses must remain same-origin and must not expose a signed URL or `Location` header.
- Keep the CSP report-only until staging telemetry is reviewed. It must never add `unsafe-eval`; enforcement requires a separate approved change after inline-script compatibility is solved.
- Enable HSTS only on the final production HTTPS host after certificate, proxy protocol, and subdomain scope are verified. Phase 10 does not preload or include subdomains.
- Preserve same-origin mutation checks, active-admin checks, fixed-search-path RPCs, RLS, private buckets, and public proxy publication checks.

## Release completion gate

Do not create the Phase 10 completion tag while any required restore, staging/production HTTP, Browser, regression, alert ownership, DNS/TLS, or Wix-control evidence is missing. Record the state as `PARTIALLY READY` or `BLOCKED` with exact commands and evidence locations.
