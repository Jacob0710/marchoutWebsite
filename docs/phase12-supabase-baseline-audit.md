# Phase 12 Supabase baseline audit

This is a schema provenance and staging-rebuild record, not a Phase 12
completion report.

## Provenance decision

The current `supabase/schema.sql` is a 13-line, non-executable deprecation
notice and cannot bootstrap a database. Git history provides a stronger source:
the 205-line schema stored by all four immutable tags from
`phase-4-supabase-public-frontend-complete` through
`phase-7-admin-access-governance-complete` has the same blob hash. The SQL
statement sequence in
`20260713000100_phase4_public_schema_baseline.sql` is exactly that historic
snapshot, with only a transaction wrapper and provenance comments added.

No production data or a partial staging schema was used to infer the baseline.
Application queries, server APIs, Phase 4/5 requirements, later migrations, and
the read-only verification SQL all agree with the recovered source.

## Baseline contents

- Extension: `pgcrypto`.
- Tables: `activities`, `activity_images`, `posts`, `files`, `categories`,
  `faq`, and `site_settings`.
- Primary keys: one UUID primary key on each table.
- Foreign keys:
  `activity_images.activity_id -> activities.id on delete cascade` and
  `files.activity_id -> activities.id on delete set null`.
- Unique constraints: activity, post, and category slugs.
- Checks: activity type/status, post status, and category type.
- Defaults: generated UUIDs, timestamps, activity/post draft status, empty
  tags, visibility/featured flags, counters, ordering, and the static
  organization identity defaults on `site_settings`.
- Indexes: activity slug/status/year, post slug/status, file year, and FAQ
  order.
- RLS: enabled on all seven tables.
- Initial policies: published/visible public reads and the historic Phase 4
  authenticated-write policies.
- Storage configuration: the two historic `activity-images` and
  `public-files` bucket records plus their initial policies.
- Functions, triggers, custom types, non-public schemas, and explicit grants:
  none in the baseline.

The only `INSERT` is idempotent Storage bucket configuration. There is no
application-content `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, table `DROP`,
Auth user, administrator mapping, personal data, credential, connection string,
or production row. Re-execution is guarded by `if not exists`, policy
drop/recreate, and bucket conflict handling.

## Seed audit

`supabase/seed.sql` contains four synthetic Phase 4 activity rows and an upsert.
It is an optional historical demo fixture, not schema, and is excluded from all
staging/release migration commands. Phase 12 uses only its run-namespaced
deterministic seed and cleanup scripts.

## Compatibility with the ordered chain

- Phase 5 receives all seven relations required by its policy removals and adds
  `admin_users` plus fixed-search-path `is_admin()`.
- Phase 6 can alter `activities`, add assets/videos, replace activity policies,
  and create the private `activity-assets` bucket.
- Phase 7 extends the Phase 5 administrator table and functions.
- Phase 8 evolves `posts`, `files`, `faq`, `site_settings`, and `categories`,
  adds `year_summaries`, removes every known broad Phase 4 content policy,
  makes both legacy buckets private, and adds the private `content-assets` and
  `downloads` buckets.
- Phases 9 and 10 receive the complete content schema, provenance targets,
  publication state, private Storage paths, and administrator primitives they
  reference.

The final chain has no broad `FOR ALL` policy, no application role with
`BYPASSRLS`, and no SECURITY DEFINER function without a fixed `search_path`.

## Staging partial-state recovery

The linked project was verified by name and region and was proven different
from production before any destructive operation. Pre-reset inventory showed
zero Auth users, zero administrator mappings, zero Storage buckets/objects,
zero public content rows, and only remote migration `20260714000100`.

The disposable staging database was reset with seeding disabled and stopped at
the new baseline version. A subsequent dry run listed exactly the remaining ten
migrations and no seed or role file. Applying them succeeded. The final
migration list contains eleven matching LOCAL/REMOTE versions, and another dry
run reports the remote database is up to date.

No production reset, repair, push, seed, Auth operation, Storage operation, or
content mutation was performed.

## Post-rebuild verification snapshot

- Public tables: 25; RLS enabled on all 25.
- Public indexes: 69.
- Public constraints: 226.
- Enabled non-internal public triggers: 24.
- Public functions: 53.
- SECURITY DEFINER functions: 46; unsafe fixed-search-path findings: 0.
- Broad `FOR ALL` policies: 0.
- Application roles with `BYPASSRLS`: 0.
- Required private buckets: `activity-assets`, `content-assets`, `downloads`.
- Legacy private buckets retained for compatibility:
  `activity-images`, `public-files`.
- Storage objects immediately after rebuild: 0.

The repository verification, admin Auth/CRUD/access SQL, Phase 8 SQL, Phase 9
SQL, and public-activities SQL passed in database-owner context. The Phase 10
data reconciliation remains gated on its documented deterministic editorial
bootstrap and is not represented as complete by this audit.
