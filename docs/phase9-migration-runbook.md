# Phase 9 Wix and legacy migration runbook

## Frozen source and safety boundary

The authoritative source is `https://a0903080125.wixsite.com/website`. The accepted snapshot SHA-256 is `3a6a00bcd5a5b8030ab5da6b61cd597f2df4c0762edb46dd9f8655e003cceb60`: 83 pages and 398 validated source assets (147 images and 251 attachments). Raw HTML, downloads, extracted PDF/DOCX text, credentials, and signed URLs stay in ignored local working paths and are removed after acceptance.

Formal content writes and uploads must use the active-admin Nitro Server APIs, same-origin mutation checks, the user's JWT, Supabase RLS, and the existing private buckets. The narrow fixed-search-path Phase 9 RPCs record run and source provenance only. Never add a service-role key, use Supabase Auth Admin APIs, or permit direct browser writes to content tables or Storage.

## Durable evidence

- `source-snapshot.json`: canonical source, crawl metadata, source/target baseline, and snapshot hash;
- `source-inventory.jsonl`: one explicit disposition for every page, asset, repository item, legacy row, external discovery item, and mock;
- `content-manifest.jsonl`: normalized operations, target keys, hashes, desired status, warnings, and migration blockers;
- `assets-manifest.jsonl`: source hash/cache identity, owner, private destination, MIME, filename, and role;
- `static-pages-manifest.jsonl`: source-to-section evidence for static routes;
- `manual-review.csv`: publication/redaction/redirect work with blocking scope and resolution;
- `url-redirects.csv`: verified structural 301 candidates plus intentionally inactive draft targets;
- `rollback-manifest.jsonl`: reverse dependency order for targets created or merged by the real run.

## Discovery and normalization

```bash
pnpm phase9:discover
pnpm phase9:inventory
```

Discovery is rate-limited, follows redirects manually, retries transient responses, validates status/MIME/signatures/size, de-duplicates by hash, and stores raw artifacts only in ignored cache. PDF and DOCX text extraction supplies source evidence; manifests retain only safe derived facts and hashes, never full personal-data text.

Missing date, year, classification, participant count, result, attachment context, or redaction approval is never invented. Such content is imported to private Storage as `draft`, receives a manual-review row, and cannot be published until an editor resolves the source issue. In this run, manual review blocks migration for zero items and blocks publication for 122 items.

## Database setup and verification

Apply in filename order after a recoverable backup and Storage inventory:

1. `20260721_001_phase9_content_migration_provenance.sql`
2. `20260721_002_phase9_publish_timestamp_consistency.sql`

Run `supabase/verify-phase9-content-migration.sql`. A successful result is `true / true / true` for provenance, target integrity, and terminal run state. The verification covers RLS, revoked direct grants, authenticated-only narrow RPC execution, fixed search paths, target validation, publication triggers, and unfinished runs.

## Controlled lifecycle

```bash
pnpm phase9:dry-run
pnpm phase9:apply
pnpm phase9:resume
pnpm phase9:verify
pnpm phase9:apply          # second apply: zero mutations
pnpm test:phase9           # isolated synthetic rollback proof
pnpm phase9:apply          # restore the real rollback manifest after synthetic proof
pnpm phase9:cleanup-scan
```

The real run key is `phase9-wix-3a6a00bcd5a5b8030ab5da6b`. Checkpoints are saved after every target and object. Resume reuses the same run and source references. An unchanged second apply must report 0 created, 0 updated, 0 uploaded, and 71 skipped. A changed normalized payload is accepted only as an explicit controlled update for the same source hash and target kind.

The synthetic suite creates five isolated rows and five private objects, verifies public visibility/draft boundaries, resumes, applies a second time, and deletes all five rows, objects, and source references. It is rollback evidence only and is never counted as Wix content.

## Reconciliation and acceptance

The accepted real result is:

- Activities: 4 before, 46 created, 50 after; imported 46 draft / 0 published;
- Posts: 0 before and after; no authoritative Wix posts;
- Files: 0 before, 18 created, 18 after; imported 18 draft / 0 published;
- FAQ: 0 before and after; no authoritative Wix FAQ;
- Year Summaries: 0 before, 6 created, 6 after; imported 6 draft / 0 published;
- Site Settings: one existing singleton merged with the authoritative Facebook and Instagram links;
- Storage: 378 referenced private objects, 120,109,005 bytes, 0 orphan, 0 missing.

Verify every source reference and target, activity asset count, file upload, admin download, public draft 404, settings merge, module total, bucket object, and byte total. Production preview acceptance covers desktop/mobile layout, one H1, alt attributes, overflow, mobile menu, static About source copy, admin routing, `/supabase-test` isolation, console/hydration diagnostics, and representative draft isolation.

## Rollback and cleanup

Real rollback is operator-reviewed: stop mutations, confirm the run key and backup owner, restore the Site Settings backup, delete only `createdByRun` targets in reverse dependency order through Server APIs, retain provenance/run evidence, and reconcile unrelated changes. Never delete an object from a filename match alone.

After acceptance, remove smoke/synthetic fixtures, temporary PDF renders, raw source caches, extracted document text, local logs, and ignored credentials. Run `phase9:cleanup-scan` again. Release only when every bucket has zero orphans/missing objects, secret scans are clean, production preview passes, and the remote `main` and completion tag resolve to the reviewed commit.
