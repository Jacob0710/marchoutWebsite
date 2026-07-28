# Phase 10 backup and restore runbook

Phase 10 remote mutations are forbidden until both the database and private Storage have a recoverable checkpoint and the database dump has been restored into an isolated staging database. The application admin session is not a substitute for Supabase platform or database backup authority.

## Preconditions

- Install version-compatible `pg_dump` and `pg_restore`.
- Place database credentials only in an ignored `.env.phase10.local`; never pass them in chat, commit them, or print them.
- Use a restore database host that is different from production.
- Confirm all five private buckets remain private and that the active administrator can read their objects.

## Create evidence

1. Run `pnpm phase10:backup:inventory`. It downloads objects into memory only, records path/size/SHA-256 in `.phase10-private/backups/storage-inventory.json`, and persists no raw object.
2. Run `pnpm phase10:backup:checkpoint`. It creates an ignored custom-format database dump and a machine-readable checkpoint record.
3. Configure the isolated restore database and set `PHASE10_RESTORE_CONFIRM=staging-rehearsal`.
4. Run `pnpm phase10:backup:restore -- --checkpoint=<checkpoint-key>`.
5. Run `pnpm phase10:bootstrap:dry-run` to produce the ignored, hash-checked restore payload, then run `pnpm phase10:restore:verify`. It applies the deterministic bootstrap only to the isolated restore database, runs the Phase 8–10 SQL verification set, and compares the reconciled counts.

Use `PHASE10_RESTORE_SCOPE=full` for a Supabase-compatible staging database. For a local PostgreSQL recovery drill that does not provide Supabase-managed extensions, set `PHASE10_RESTORE_SCOPE=application`; the command recreates and restores the complete application-owned `public` schema, installs minimal `auth`/`storage` compatibility fixtures only for constraint and policy validation, and records that managed platform schemas were excluded. This is the small-scope restore rehearsal allowed by the Phase 10 checkpoint requirement; it does not replace a separate Supabase staging project for hosted Browser acceptance.

The logical dump intentionally omits object ownership but retains grants/ACLs. Restoring data and schema without the `anon`/`authenticated` RPC and RLS grants is not considered recoverable.
6. Hash the verification output and use its identifiers only through the safety-checkpoint API. Do not copy raw dumps or object payloads into the repository.

## Stop conditions

- `pg_dump`/`pg_restore` is unavailable.
- The restore host equals production.
- Any object cannot be read or changes size while hashing.
- Restored counts, provenance, RLS, grants, policies, or Storage references differ.
- The backup identifier or evidence hashes cannot be independently located.

Any stop condition leaves `mutationAllowed=false`; editorial bootstrap, decision application, publishing, and redirect activation must remain blocked.
