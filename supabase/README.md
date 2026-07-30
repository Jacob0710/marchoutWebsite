# Supabase schema and operations

## Source of truth

Ordered SQL files in `migrations/` are the only authoritative schema source. `schema.sql` is intentionally a non-executable deprecation notice: its historic Phase 1–4 snapshot contained public buckets and broad authenticated write assumptions that must not be revived.

For a fresh Supabase project, apply these files in order:

1. `20260714000100_admin_users.sql`
2. `20260714000200_admin_activity_read_policy.sql`
3. `20260715000100_phase6_activity_crud_assets.sql`
4. `20260716000100_phase7_admin_access_governance.sql`
5. `20260720000100_phase8_core_content_platform.sql`
6. `20260721000100_phase9_content_migration_provenance.sql`
7. `20260721000200_phase9_publish_timestamp_consistency.sql`
8. `20260722000100_phase10_editorial_review_queue.sql`
9. `20260722000200_phase10_release_batches.sql`
10. `20260722000300_phase10_redirect_review_hotfix.sql`

Use a trusted database owner through the Supabase SQL Editor or an approved migration runner. Record project, migration filename, commit, operator, timestamp, and result in the environment's operations log. SQL Editor history is not exported into Git and cannot replace migration records.

## Phase 8 migration behavior

The Phase 8 migration evolves legacy content tables without discarding rows. It adds publication, audit, private-object metadata, ordering, validation, indexes, and active-administrator policies; creates `year_summaries`; enforces singleton `site_settings`; adds atomic FAQ ordering; and makes categories read-only.

Legacy `file_url` and related URL data remain nullable compatibility fields for a later inventoried migration. Formal Phase 8 APIs use `storage_path`, filename, MIME, and size metadata. The migration makes the old `activity-images` and `public-files` buckets private without deleting their objects.

Private buckets:

- `activity-assets`: Phase 6 activity images and attachments
- `content-assets`: post and year-summary covers
- `downloads`: downloadable file objects

Published-object Storage select policies are constrained by path and the related published database row. They let the Nitro server download an authorized object and return validated same-origin bytes; no Phase 8 bucket is public, no blanket object-read policy exists, and browser routes do not expose signed URLs.

Phase 10 removes the legacy direct public table-read policies from `activity_assets` and `files`. Anonymous callers obtain only narrow published metadata through the Phase 10 RPCs; authenticated non-admin users receive no raw asset/file rows. Managed-content triggers block bypassing the reviewed release lifecycle and preserve immutable Phase 9 originals.

## Verification

After applying migrations, run the repeatable read-only verification files:

1. `verify-admin-auth.sql`
2. `verify-admin-crud.sql`
3. `verify-admin-access.sql`
4. `verify-phase8-core-content.sql`
5. `verify-phase9-content-migration.sql`
6. `verify-phase10-editorial-release.sql` after the deterministic Phase 10 bootstrap and decisions

`verify-phase8-core-content.sql` checks schema, constraints, indexes, functions, fixed search paths, grants, RLS, policies, private buckets, and the settings singleton. `verify-phase9-content-migration.sql` verifies the provenance tables, RLS/grants, narrow fixed-search-path RPCs, publication-timestamp triggers, target-reference integrity, and terminal run state. Its final row contains three `true` values.

`verify-phase10-editorial-release.sql` checks the private review/release tables, safe public metadata RPCs, fixed-search-path functions, exact 70/122/83 reconciliation, separation of the existing Activity draft, evidence-gated publication/redirect state, derivative/original boundaries, Storage readability predicates, and append-only audit enforcement. It must run with a database owner after bootstrap; application credentials cannot read the private tables directly.

Then start a production preview and run:

```bash
pnpm test:phase5
pnpm test:phase6
pnpm test:phase7
pnpm test:phase8
pnpm test:phase9
pnpm test:phase10
```

## Credential boundary

Nuxt uses the public anon key and, for administrator operations, the signed-in user's JWT. Do not add a service-role key, database password/URL, private key, or Auth Admin API credential to application runtime, test output, or Git. RLS and fixed-search-path functions are required even when requests originate from the server API.

## Backup and rollback

Before applying migrations to a shared environment:

- take a recoverable database backup;
- inventory each affected Storage bucket and its public/private state;
- record content row counts and any legacy URLs;
- ensure application mutations can be paused;
- identify the restore owner and maintenance window.

There is no automatic destructive down migration. If verification fails, preserve the failed transaction/output, determine whether the transaction rolled back, and prefer a reviewed idempotent forward migration. Do not delete legacy Storage objects until a later migration has mapped, copied, verified, and explicitly approved their removal.
