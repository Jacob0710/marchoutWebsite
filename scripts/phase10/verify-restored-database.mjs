import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assertNoSecretShape, phase9SnapshotSha256, root, sha256 } from './lib/core.mjs'

const commandPath = (name) => {
  const result = spawnSync('where.exe', [name], { encoding: 'utf8', shell: false })
  return result.status === 0 ? result.stdout.split(/\r?\n/).find(Boolean) : null
}

const restore = {
  host: process.env.PHASE10_RESTORE_DB_HOST,
  port: process.env.PHASE10_RESTORE_DB_PORT || '5432',
  user: process.env.PHASE10_RESTORE_DB_USER || 'postgres',
  name: process.env.PHASE10_RESTORE_DB_NAME || 'postgres',
  password: process.env.PHASE10_RESTORE_DB_PASSWORD
}
if (process.env.PHASE10_RESTORE_CONFIRM !== 'staging-rehearsal' || !restore.host || !restore.password) {
  throw new Error('BLOCKED: an explicit isolated restore target and confirmation are required')
}
if (restore.host === process.env.SUPABASE_DB_HOST) throw new Error('BLOCKED: restore verification target must not be production')

const psql = commandPath('psql.exe') || commandPath('psql')
if (!psql) throw new Error('BLOCKED: psql is required for restored database verification')
const env = { ...process.env, PGPASSWORD: restore.password }
const baseArgs = ['--host', restore.host, '--port', restore.port, '--username', restore.user, '--dbname', restore.name, '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1']
const runSql = (sql) => spawnSync(psql, baseArgs, { encoding: 'utf8', shell: false, env, input: sql })
const runFile = (path) => spawnSync(psql, [...baseArgs, '--file', resolve(root, path)], { encoding: 'utf8', shell: false, env })

const payload = JSON.parse(await readFile(resolve(root, '.phase10-private/phase10-bootstrap-payload.json'), 'utf8'))
assertNoSecretShape(payload, 'restored database bootstrap payload')
if (payload.sourceSnapshotSha256 !== phase9SnapshotSha256) throw new Error('Restored database payload snapshot mismatch')
const payloadBody = { sourceSnapshotSha256: payload.sourceSnapshotSha256, targets: payload.targets, redirects: payload.redirects, reviews: payload.reviews }
if (payload.manifestSha256 !== sha256(payloadBody)) throw new Error('Restored database payload hash mismatch')
if (payload.targets.length !== 70 || payload.redirects.length !== 83 || payload.reviews.length !== 122) throw new Error('Restored database payload count mismatch')

const jsonLiteral = (value, tag) => {
  const json = JSON.stringify(value)
  if (json.includes(`$${tag}$`)) throw new Error(`Unexpected ${tag} delimiter in restore payload`)
  return `$${tag}$${json}$${tag}$::jsonb`
}
const correlationId = randomUUID()
const bootstrapSql = `
begin;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.admin_users where is_active order by created_at, user_id limit 1),
  true
);
select * from public.phase10_bootstrap_editorial(
  '${payload.sourceSnapshotSha256}',
  '${payload.manifestSha256}',
  ${jsonLiteral(payload.targets, 'phase10targets')},
  ${jsonLiteral(payload.redirects, 'phase10redirects')},
  ${jsonLiteral(payload.reviews, 'phase10reviews')},
  '${correlationId}'::uuid
);
commit;
`
const bootstrap = runSql(bootstrapSql)
if (bootstrap.status !== 0) throw new Error(`Restored database editorial bootstrap failed (${bootstrap.status})`)

const editorialDecisions = JSON.parse(await readFile(resolve(root, 'migration/phase10/editorial-decisions.json'), 'utf8'))
const redirectDecisions = JSON.parse(await readFile(resolve(root, 'migration/phase10/redirect-decisions.json'), 'utf8'))
if (editorialDecisions.summary.total !== 70 || redirectDecisions.summary.total !== 83) throw new Error('Restored database decision manifest count mismatch')
const decisionOperations = [
  ...editorialDecisions.decisions.map((decision) => ({ kind: 'review', ...decision })),
  ...redirectDecisions.decisions.filter((decision) => decision.reviewKey).map((decision) => ({ kind: 'review', ...decision })),
  ...redirectDecisions.decisions.filter((decision) => !decision.reviewKey).map((decision) => ({ kind: 'redirect', ...decision }))
]
if (decisionOperations.length !== 153) throw new Error('Restored database decision operation count mismatch')
const sqlText = (value, tag) => {
  const text = String(value)
  if (text.includes(`$${tag}$`)) throw new Error(`Unexpected ${tag} delimiter in decision manifest`)
  return `$${tag}$${text}$${tag}$`
}
const decisionStatements = decisionOperations.map((operation, index) => {
  const tag = `decision${index}`
  if (operation.kind === 'review') {
    return `perform public.phase10_update_editorial_review(
      ${sqlText(operation.reviewKey, `${tag}key`)}, ${sqlText(operation.state, `${tag}state`)},
      ${sqlText(operation.decision, `${tag}value`)}, ${sqlText(operation.reason, `${tag}reason`)},
      false, false, false, false,
      (select coalesce(t.target_version, d.target_version)
        from public.editorial_reviews r
        left join public.editorial_targets t on t.id = r.editorial_target_id
        left join public.editorial_redirects d on d.id = r.editorial_redirect_id
        where r.review_key = ${sqlText(operation.reviewKey, `${tag}lookup`)}),
      '${randomUUID()}'::uuid
    );`
  }
  return `perform public.phase10_decide_redirect(
    ${sqlText(operation.redirectKey, `${tag}key`)}, ${sqlText(operation.decision, `${tag}value`)},
    ${sqlText(operation.reason, `${tag}reason`)}, '${randomUUID()}'::uuid
  );`
}).join('\n')
const decisions = runSql(`
begin;
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.admin_users where is_active order by created_at, user_id limit 1),
  true
);
do $phase10decisions$
begin
${decisionStatements}
end
$phase10decisions$;
commit;
`)
if (decisions.status !== 0) throw new Error(`Restored database conservative decisions failed (${decisions.status})`)

for (const verification of [
  'supabase/verify-phase8-core-content.sql',
  'supabase/verify-phase9-content-migration.sql',
  'supabase/verify-phase10-editorial-release.sql'
]) {
  const result = verification.endsWith('verify-phase10-editorial-release.sql')
    ? runSql(`
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.admin_users where is_active order by created_at, user_id limit 1),
  false
);
${await readFile(resolve(root, verification), 'utf8')}
`)
    : runFile(verification)
  if (result.status !== 0) throw new Error(`${verification} failed on restored database (${result.status})`)
}

const counts = runSql(`
select json_build_object(
  'activities', (select count(*) from public.activities),
  'files', (select count(*) from public.files),
  'yearSummaries', (select count(*) from public.year_summaries),
  'targets', (select count(*) from public.editorial_targets),
  'redirects', (select count(*) from public.editorial_redirects),
  'reviews', (select count(*) from public.editorial_reviews),
  'storageReferences', (select count(*) from public.activity_assets) + (select count(*) from public.files where storage_path is not null)
);
`)
if (counts.status !== 0) throw new Error(`Restored database reconciliation query failed (${counts.status})`)
const summary = JSON.parse(counts.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1))
console.log(JSON.stringify({
  status: 'passed',
  environment: 'isolated-restore',
  productionHostChanged: false,
  verifications: ['phase8', 'phase9', 'phase10'],
  counts: summary
}, null, 2))
