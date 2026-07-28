import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { access, mkdir, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'
import { createAdminClient } from './lib/runtime.mjs'
import { root, sha256, writePrivateJson } from './lib/core.mjs'

const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || 'inventory'
if (!['inventory', 'checkpoint', 'restore-rehearsal'].includes(mode)) throw new Error(`Unsupported backup mode: ${mode}`)
const privateDir = resolve(root, '.phase10-private/backups')
await mkdir(privateDir, { recursive: true })

const commandPath = (name) => {
  const result = spawnSync('where.exe', [name], { encoding: 'utf8', shell: false })
  return result.status === 0 ? result.stdout.split(/\r?\n/).find(Boolean) : null
}

const storageInventory = async () => {
  const client = await createAdminClient()
  const buckets = ['activity-assets', 'content-assets', 'downloads', 'activity-images', 'public-files']
  const inventory = { schemaVersion: 1, createdAt: new Date().toISOString(), buckets: {}, totals: { objects: 0, bytes: 0 } }
  try {
    for (const bucket of buckets) {
      const objects = []; const pending = ['']
      while (pending.length) {
        const prefix = pending.shift()
        const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
        if (error) throw new Error(`Cannot list private bucket ${bucket}: ${error.message}`)
        for (const item of data) {
          const path = prefix ? `${prefix}/${item.name}` : item.name
          if (item.id) objects.push({ path, sizeBytes: Number(item.metadata?.size || 0) })
          else pending.push(path)
        }
      }
      let cursor = 0; let completed = 0
      const concurrency = Math.min(4, Math.max(1, Number(process.env.PHASE10_STORAGE_HASH_CONCURRENCY || 4)))
      const worker = async () => {
        while (cursor < objects.length) {
          const index = cursor; cursor += 1
          const object = objects[index]
          const { data, error } = await client.storage.from(bucket).download(object.path)
          if (error || !data) throw new Error(`Cannot hash private object in ${bucket} at inventory index ${index}`)
          const bytes = new Uint8Array(await data.arrayBuffer())
          if (bytes.length !== object.sizeBytes) throw new Error(`Storage size changed in ${bucket} at inventory index ${index}`)
          object.sha256 = createHash('sha256').update(bytes).digest('hex')
          completed += 1
          if (completed % 25 === 0 || completed === objects.length) console.error(`HASH_PROGRESS ${bucket} ${completed}/${objects.length}`)
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, objects.length || 1) }, worker))
      objects.sort((a, b) => a.path.localeCompare(b.path))
      inventory.buckets[bucket] = { objects }
      inventory.totals.objects += objects.length
      inventory.totals.bytes += objects.reduce((sum, object) => sum + object.sizeBytes, 0)
    }
  } finally { await client.auth.signOut({ scope: 'local' }) }
  inventory.inventorySha256 = sha256(inventory.buckets)
  await writePrivateJson('.phase10-private/backups/storage-inventory.json', inventory)
  return inventory
}

if (mode === 'inventory') {
  const inventory = await storageInventory()
  console.log(JSON.stringify({ mode, status: 'complete', totals: inventory.totals, inventorySha256: inventory.inventorySha256, rawObjectsPersisted: false }, null, 2))
  process.exit(0)
}

const pgDump = commandPath('pg_dump.exe') || commandPath('pg_dump')
const pgRestore = commandPath('pg_restore.exe') || commandPath('pg_restore')
if (!pgDump || !pgRestore) throw new Error('BLOCKED: pg_dump and pg_restore are required for a recoverable database checkpoint')

if (mode === 'checkpoint') {
  const db = {
    host: process.env.SUPABASE_DB_HOST, port: process.env.SUPABASE_DB_PORT || '5432',
    user: process.env.SUPABASE_DB_USER || 'postgres', name: process.env.SUPABASE_DB_NAME || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD
  }
  if (!db.host || !db.password) throw new Error('BLOCKED: database host/password are required for pg_dump')
  const checkpointKey = `phase10-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`
  const dumpPath = resolve(privateDir, `${checkpointKey}.dump`)
  const result = spawnSync(pgDump, ['--format=custom', '--no-owner', '--file', dumpPath, '--host', db.host, '--port', db.port, '--username', db.user, '--dbname', db.name], {
    encoding: 'utf8', shell: false, env: { ...process.env, PGPASSWORD: db.password }
  })
  if (result.status !== 0) throw new Error(`pg_dump failed (${result.status}); inspect local private diagnostics without exposing credentials`)
  await access(dumpPath, constants.R_OK)
  const dump = new Uint8Array(await readFile(dumpPath))
  if (!dump.length) throw new Error('pg_dump produced an empty checkpoint')
  const inventory = await storageInventory()
  const checkpoint = {
    schemaVersion: 1, checkpointKey, createdAt: new Date().toISOString(),
    database: { backupId: `logical:${checkpointKey}`, bytes: dump.length, sha256: createHash('sha256').update(dump).digest('hex'), format: 'pg_dump-custom' },
    storage: { objects: inventory.totals.objects, bytes: inventory.totals.bytes, inventorySha256: inventory.inventorySha256 },
    restoreRehearsal: null
  }
  await writePrivateJson(`.phase10-private/backups/${checkpointKey}.json`, checkpoint)
  console.log(JSON.stringify({ mode, status: 'checkpoint-created', checkpointKey, databaseBytes: dump.length, databaseSha256: checkpoint.database.sha256, storage: checkpoint.storage }, null, 2))
  process.exit(0)
}

const checkpointArg = process.argv.find((arg) => arg.startsWith('--checkpoint='))?.split('=')[1]
if (!checkpointArg || !/^[a-z0-9-]+$/.test(checkpointArg)) throw new Error('--checkpoint is required for restore rehearsal')
const restore = {
  host: process.env.PHASE10_RESTORE_DB_HOST, port: process.env.PHASE10_RESTORE_DB_PORT || '5432',
  user: process.env.PHASE10_RESTORE_DB_USER || 'postgres', name: process.env.PHASE10_RESTORE_DB_NAME || 'postgres',
  password: process.env.PHASE10_RESTORE_DB_PASSWORD
}
const restoreScope = process.env.PHASE10_RESTORE_SCOPE || 'full'
if (!['full', 'application'].includes(restoreScope)) throw new Error('BLOCKED: PHASE10_RESTORE_SCOPE must be full or application')
if (process.env.PHASE10_RESTORE_CONFIRM !== 'staging-rehearsal' || !restore.host || !restore.password) throw new Error('BLOCKED: an explicit isolated staging restore target and confirmation are required')
if (restore.host === process.env.SUPABASE_DB_HOST) throw new Error('BLOCKED: restore rehearsal target must not be the production database host')
const dumpPath = resolve(privateDir, `${checkpointArg}.dump`)
await access(dumpPath, constants.R_OK)
const restoreEnv = { ...process.env, PGPASSWORD: restore.password }
const restoreBaseArgs = ['--exit-on-error', '--no-owner', '--host', restore.host, '--port', restore.port, '--username', restore.user, '--dbname', restore.name]
const runRestore = (args) => spawnSync(pgRestore, [...restoreBaseArgs, ...args, dumpPath], { encoding: 'utf8', shell: false, env: restoreEnv })

let restoreResult
if (restoreScope === 'full') {
  restoreResult = runRestore(['--clean', '--if-exists'])
} else {
  const psql = commandPath('psql.exe') || commandPath('psql')
  if (!psql) throw new Error('BLOCKED: psql is required for an application-schema restore rehearsal')
  const runSql = (sql) => spawnSync(psql, ['--host', restore.host, '--port', restore.port, '--username', restore.user, '--dbname', restore.name, '--set', 'ON_ERROR_STOP=1'], {
    encoding: 'utf8', shell: false, env: restoreEnv, input: sql
  })
  const bootstrap = runSql(`
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then create role supabase_admin nologin; end if;
end $$;
drop schema if exists public cascade;
drop schema if exists auth cascade;
drop schema if exists storage cascade;
create schema public;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$ select null::text $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create schema storage;
create table storage.buckets (id text primary key, public boolean not null default false);
insert into storage.buckets(id, public) values
  ('activity-assets', false), ('content-assets', false), ('downloads', false),
  ('activity-images', false), ('public-files', false);
create table storage.objects (id uuid, bucket_id text, name text, owner uuid, metadata jsonb);
alter table storage.objects enable row level security;
create function storage.foldername(p_name text) returns text[] language sql immutable as $$
  select case when array_length(string_to_array(p_name, '/'), 1) > 1
    then (string_to_array(p_name, '/'))[1:array_length(string_to_array(p_name, '/'), 1) - 1]
    else array[]::text[] end
$$;
create function storage.extension(p_name text) returns text language sql immutable as $$
  select lower(substring(p_name from '\\.([^.]*)$'))
$$;
`)
  if (bootstrap.status !== 0) throw new Error(`application restore bootstrap failed (${bootstrap.status})`)
  for (const section of ['pre-data', 'data']) {
    const result = runRestore(['--schema', 'public', '--section', section])
    if (result.status !== 0) throw new Error(`application restore ${section} failed (${result.status})`)
  }
  const seedAuth = runSql(`
do $$
declare c record;
begin
  for c in select table_schema, table_name, column_name from information_schema.columns where table_schema = 'public' and data_type = 'uuid' loop
    execute format(
      'insert into auth.users(id) select distinct %I from %I.%I where %I is not null on conflict do nothing',
      c.column_name, c.table_schema, c.table_name, c.column_name
    );
  end loop;
end $$;
`)
  if (seedAuth.status !== 0) throw new Error(`application restore auth fixture failed (${seedAuth.status})`)
  restoreResult = runRestore(['--schema', 'public', '--section', 'post-data'])
}
if (restoreResult.status !== 0) throw new Error(`pg_restore rehearsal failed (${restoreResult.status})`)
const evidence = {
  schemaVersion: 1, checkpointKey: checkpointArg, status: 'restored-to-isolated-staging',
  restoredAt: new Date().toISOString(), productionHostChanged: false, restoreScope,
  managedPlatformSchemasExcluded: restoreScope === 'application',
  evidenceSha256: sha256({ checkpointKey: checkpointArg, status: 'restored-to-isolated-staging', restoreScope, exitCode: restoreResult.status })
}
await writePrivateJson(`.phase10-private/backups/${checkpointArg}-restore-evidence.json`, evidence)
const checkpointRecord = JSON.parse(await readFile(resolve(privateDir, `${checkpointArg}.json`), 'utf8'))
await writePrivateJson(`.phase10-private/backups/${checkpointArg}.json`, { ...checkpointRecord, restoreRehearsal: evidence })
console.log(JSON.stringify(evidence, null, 2))
