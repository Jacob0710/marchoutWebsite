# Supabase schema and operations

## Source of truth

Ordered SQL files in `migrations/` are the only authoritative schema source. `schema.sql` is intentionally a non-executable deprecation notice: its historic Phase 1–4 snapshot contained public buckets and broad authenticated write assumptions that must not be revived.

For a fresh Supabase project, apply these files in order:

1. `20260714_001_admin_users.sql`
2. `20260714_002_admin_activity_read_policy.sql`
3. `20260715_001_phase6_activity_crud_assets.sql`
4. `20260716_001_phase7_admin_access_governance.sql`
5. `20260720_001_phase8_core_content_platform.sql`

Use a trusted database owner through the Supabase SQL Editor or an approved migration runner. Record project, migration filename, commit, operator, timestamp, and result in the environment's operations log. SQL Editor history is not exported into Git and cannot replace migration records.

## Phase 8 migration behavior

The Phase 8 migration evolves legacy content tables without discarding rows. It adds publication, audit, private-object metadata, ordering, validation, indexes, and active-administrator policies; creates `year_summaries`; enforces singleton `site_settings`; adds atomic FAQ ordering; and makes categories read-only.

Legacy `file_url` and related URL data remain nullable compatibility fields for a later inventoried migration. Formal Phase 8 APIs use `storage_path`, filename, MIME, and size metadata. The migration makes the old `activity-images` and `public-files` buckets private without deleting their objects.

Private buckets:

- `activity-assets`: Phase 6 activity images and attachments
- `content-assets`: post and year-summary covers
- `downloads`: downloadable file objects

Published-object Storage select policies are constrained by path and the related published database row. They exist so the server anon client can issue a short-lived signed URL; no Phase 8 bucket is public and no blanket object-read policy exists.

## Verification

After applying migrations, run the repeatable read-only verification files:

1. `verify-admin-auth.sql`
2. `verify-admin-crud.sql`
3. `verify-admin-access.sql`
4. `verify-phase8-core-content.sql`

`verify-phase8-core-content.sql` checks schema, constraints, indexes, functions, fixed search paths, grants, RLS, policies, private buckets, and the settings singleton. A successful run reaches the final row with `phase8_invariants_verified = true`.

Then start a production preview and run:

```bash
pnpm test:phase5
pnpm test:phase6
pnpm test:phase7
pnpm test:phase8
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
