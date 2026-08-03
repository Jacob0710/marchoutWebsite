# March Out For Love — Phase 13 execution specification

Date: 2026-08-04 (Asia/Taipei)
Phase: Content and Asset Reconciliation Preparation

This repository copy records the owner-provided Phase 13 execution contract used for implementation and review.

## Mandatory boundary

Phase 13 is repository-only. It must not query or authenticate to production, call a production management API, list/download production private Storage, execute production SQL, create/update/delete/publish production content, obtain production credentials, or recrawl live Wix. Only committed safe evidence and synthetic fixtures may be processed.

Required counters at completion:

```text
productionQueries = 0
productionAuthenticatedSessions = 0
productionMutations = 0
liveWixRecrawls = 0
```

Production read-only inventory, owner asset review, administrator UAT, and public launch are Phase 14 work.

## Baseline identity

Before modification:

1. Fetch `origin` and tags without rewriting history.
2. Require local branch `main`.
3. Require `HEAD = origin/main = phase-12-e2e-staging-release-complete^{}`.
4. Require local/remote annotated tag objects to agree.
5. Require the tracked worktree to be clean; identify and preserve unrelated untracked user files.
6. Run frozen install and the actual Phase 12 repository verifier from `package.json`.
7. Confirm existing protected-main required checks without weakening branch protection.

If identity cannot be verified, stop as `BLOCKED — PHASE 12 BASELINE IDENTITY NOT VERIFIED`. Do not reset, rebase, force push, move tags, clean, stash, or overwrite user files.

Working branch: `codex/phase13-content-asset-reconciliation-prep`.

## Historical count domains

All values are historical repository evidence, not current production state:

```text
source_inventory_skip_items = 70
imported_target_records_draft = 70
source_assets = 398
migrated_storage_objects = 378
publication_reviews = 122
redirects_accepted_out_of_scope = 52
```

The two values of 70 are independent and their row relationship is unresolved. The values 398 and 378 are independent domains; subtraction must not be described as missing production assets. Source inventory rows, source-unique assets, Storage assignments, and owner references must remain separate.

## Required deliverables

1. Baseline execution status with branch, SHA/tag identities, toolchain, frozen install, verifier, CI, and preserved untracked-file evidence.
2. Deterministic evidence locator covering Phase 9–12 inventory, manifest, provenance, reviews, redirects, migrations, verification, scripts, workflows, and reports; each entry includes type, path, format/schema, tracking, bytes, SHA-256, phase, authority, and sensitivity flag.
3. Version 1 strict schemas for source item, asset relationship, inventory summary, and sanitized future production export.
4. Deterministic source and asset normalizers that never modify authoritative evidence and never silently discard unresolved relationships.
5. Offline baseline with explicit count-domain namespace, evidence date/source, unresolved relationships, accepted out-of-scope decisions, warnings, and comparison fingerprints.
6. Asset JSON, unsigned owner-review CSV, and gap report supporting roles `cover`, `gallery`, `attachment`, `download`, `logo`, `content-image`, `document`, `unknown`; owners `activity`, `post`, `file`, `year-summary`, `site-settings`, `static-page`, `shared`, `unresolved`; and required dispositions.
7. A future production export adapter that accepts local files only, rejects URL input/values, credentials, signed URLs, unknown/secret-like fields, network/SQL/Supabase paths, and writes sanitized output only.
8. Missing/extra/changed comparison output for a later sanitized Phase 14 export.
9. Owner pre-launch checklist marked `DO NOT EXECUTE DURING PHASE 13` and `OWNER CHECKPOINT — EXECUTE BEFORE PUBLIC LAUNCH`.
10. Owner decisions: production inventory deferred; 52 redirects not implemented; Wix retained pending acceptance; drafts remain private; UAT uses disposable then retained Activity; historical counts are not production truth.
11. Valid/invalid schema fixtures, duplicate and multi-assignment tests, count separation, deterministic hashes, secret/signature rejection, local-path enforcement, synthetic comparison, no-network contract, output allowlist, and no-large-media check.
12. README, completion report, Phase 14 handoff, PR, required CI, normal merge, annotated completion tag, and local/remote/tag hash verification.

## Canonical safety rules

- Required and nullable fields are explicit; unknown values are `null` or closed enums.
- Owner titles are not stable identifiers. Migration keys/source hashes retain provenance.
- One source may have several assignments and owner references; these are separate relationship rows, not duplicates.
- Target paths are redacted and contain no signed parameter or access information.
- Owner decision/signature CSV fields remain empty throughout Phase 13.
- Derived output uses stable UTF-8/LF, deterministic ordering, and no current timestamp as identity.
- `.private/phase14-production-export/` is ignored and no real production export is created or tracked.
- No raw Wix media, private attachment content, private filenames, credentials, cookies, JWTs, signed URLs, browser state, or secret values enter reports, fixtures, artifacts, or Git.

## Quality and release gates

Run frozen install, schema validation, Phase 13 tests/verifier, Phase 12 regression, lint, typecheck, unit/application coverage suites, Phase 10 static regression, build, integration smoke, dependency audit, and `git diff --check`. Derived outputs must hash identically on a second run.

Open a Draft PR titled `Phase 13 — content and asset reconciliation preparation`. Keep it Draft until local verification, completion report, secret scan, deterministic output, and required CI pass. Do not use admin bypass or lower required checks. Merge normally, fetch final `main`, verify `main = origin/main`, then create/push annotated tag:

```text
phase-13-content-asset-reconciliation-prep-complete
```

The peeled tag must equal final protected `main`; remote branch/tag hashes and a clean tracked worktree are required before declaring `COMPLETE`.
