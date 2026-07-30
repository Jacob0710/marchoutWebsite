import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { encodedLegacyPathForSource, phase9SnapshotSha256, readCsv, readJson, readJsonl, redirectKeyForSource, root, sha256 } from './lib/core.mjs'

const baseline = '0784b22893ba2cf8cc2505536c079a6e2d7dd217'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const isAncestor = (ancestor, descendant) => {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd: root, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
const head = git('rev-parse', 'HEAD')
const originMain = git('rev-parse', 'refs/remotes/origin/main')
const tag = git('rev-list', '-n', '1', 'phase-9-wix-content-migration-complete')
if (!isAncestor(baseline, head) || !isAncestor(originMain, head) || tag !== baseline) {
  throw new Error('Phase 9 Git baseline/tag ancestry drifted')
}

const [content, reviews, redirects, config, decisions] = await Promise.all([
  readJsonl('migration/phase9/content-manifest.jsonl'),
  readCsv('migration/phase9/manual-review.csv'),
  readCsv('migration/phase9/url-redirects.csv'),
  readJson('migration/phase10/redirect-config.json'),
  readJson('migration/phase10/editorial-decisions.json')
])
if (content.filter((item) => item.desiredStatus === 'draft').length !== 70 || reviews.length !== 122 || redirects.length !== 83
  || decisions.summary.total !== 70 || decisions.summary.keepDraft !== 70 || decisions.summary.publish !== 0
  || config.entries.length !== 83 || config.sourceSnapshotSha256 !== phase9SnapshotSha256) throw new Error('Phase 9/10 static reconciliation failed')
for (const row of redirects) {
  const key = redirectKeyForSource(row.source_key, row.source_path)
  const item = config.entries.find((entry) => entry.redirectKey === key)
  if (!item || item.sourceEncodedPath !== encodedLegacyPathForSource(row.source_path)) throw new Error(`Redirect key/path mismatch: ${key}`)
}

const migrations = await Promise.all([
  'supabase/migrations/20260722000100_phase10_editorial_review_queue.sql',
  'supabase/migrations/20260722000200_phase10_release_batches.sql'
].map((path) => readFile(resolve(root, path), 'utf8')))
const sql = migrations.join('\n')
const expectedTables = [
  'editorial_bootstrap_runs', 'editorial_targets', 'editorial_redirects', 'editorial_reviews',
  'editorial_redacted_derivatives', 'editorial_audit_logs', 'release_safety_checkpoints',
  'release_batches', 'release_batch_items', 'release_batch_redirects'
]
for (const table of expectedTables) {
  if (!sql.includes(`create table public.${table}`) || !sql.includes(`alter table public.${table} enable row level security`)
    || !sql.includes(`revoke all on table public.${table} from public, anon, authenticated`)) throw new Error(`Private Phase 10 table boundary missing: ${table}`)
}
const functionNames = [...sql.matchAll(/create or replace function public\.(phase10_[a-z0-9_]+)\(/g)].map((match) => match[1])
for (const name of new Set(functionNames)) {
  const start = sql.indexOf(`create or replace function public.${name}(`)
  const end = sql.indexOf('\n$$;', start)
  const body = sql.slice(start, end)
  if (!body.includes('security definer') || !body.includes("set search_path = ''")) throw new Error(`Phase 10 function is not fixed-search-path SECURITY DEFINER: ${name}`)
}
if (!sql.includes('manifest_review_keys text[]') || !sql.includes('manifest_redirect_keys text[]')
  || !sql.includes('phase10_activate_batch_redirect') || !sql.includes('phase10_unpublish_managed_target')) throw new Error('Release manifest/rollback evidence fields are incomplete')
const requiredSecuritySql = [
  'drop policy if exists "Published activity assets are readable" on public.activity_assets',
  'drop policy if exists "Published files are readable" on public.files',
  'create trigger protect_phase10_managed_activity',
  'create trigger protect_phase10_managed_file',
  'create trigger protect_phase10_managed_year_summary',
  'create trigger protect_phase10_managed_activity_asset',
  'create trigger protect_phase10_managed_activity_video',
  'phase10_assert_target_delete_allowed',
  'phase10_assert_activity_asset_delete_allowed'
]
for (const fragment of requiredSecuritySql) {
  if (!sql.includes(fragment)) throw new Error(`Managed-content or direct-read security boundary missing: ${fragment}`)
}
const requiredReleaseSql = [
  "p_mode = 'apply' and p_environment not in ('staging', 'production')",
  'v_safety.environment <> p_environment',
  'v_ready.current_version is distinct from v_item.expected_target_version',
  "update public.release_batch_items set status = 'failed'",
  "update public.release_batches set status = 'failed'",
  "status in ('pending', 'failed')",
  "v_batch.status not in ('running', 'completed', 'failed')"
]
for (const fragment of requiredReleaseSql) {
  if (!sql.includes(fragment)) throw new Error(`Release environment/version/failure boundary missing: ${fragment}`)
}
const elevatedPrefix = ['sb', 'secret', ''].join('_')
if (/service[_-]?role/i.test(sql) || sql.toLowerCase().includes(elevatedPrefix)) throw new Error('Elevated credential material or naming entered migrations')

const deleted = new Set(git('ls-files', '--deleted').split(/\r?\n/).filter(Boolean))
const listed = git('ls-files', '--cached', '--others', '--exclude-standard').split(/\r?\n/).filter(Boolean)
  .filter((path) => !deleted.has(path))
const bannedArtifacts = listed.filter((path) => /(^|\/)(?:\.env(?:\.|$)|\.nuxt|\.output|\.phase10-private|\.phase10-cache)(\/|$)|\.(?:log|har)$|(?:screenshot|render-cache|download-cache)/i.test(path)
  && path !== '.env.example')
if (bannedArtifacts.length) throw new Error(`Runtime/private artifacts are present: ${bannedArtifacts.join(', ')}`)
const secretPatterns = [
  new RegExp(`${elevatedPrefix}[a-z0-9_-]{16,}`, 'i'),
  /eyJ[a-z0-9_-]{20,}\.eyJ[a-z0-9_-]{20,}\.[a-z0-9_-]{20,}/i,
  /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/i,
  new RegExp(`${['SUPABASE', 'DB', 'PASSWORD'].join('_')}=[^\\r\\n]+`, 'i')
]
const secretHits = []
for (const path of listed) {
  if (!/\.(?:ts|vue|mjs|json|jsonl|csv|md|sql|yml|yaml|example|txt)$|(?:^|\/)README$/i.test(path)) continue
  const text = await readFile(resolve(root, path), 'utf8')
  if (secretPatterns.some((pattern) => pattern.test(text))) secretHits.push(path)
}
if (secretHits.length) throw new Error(`High-confidence secret pattern found: ${secretHits.join(', ')}`)

const publicActivity = await readFile(resolve(root, 'composables/usePublicActivities.ts'), 'utf8')
const publicFiles = await readFile(resolve(root, 'server/api/public/files/index.get.ts'), 'utf8')
if (!publicActivity.includes("rpc('phase10_public_activity_assets'") || !publicActivity.includes('phase10Unavailable(response.error)')
  || !publicFiles.includes("rpc('phase10_public_files'") || !publicFiles.includes('isPhase10RpcUnavailable(response.error)')) {
  throw new Error('A public caller bypasses or lacks a migration-only fallback around the Phase 10 safe asset/file RPC boundary')
}
const publicProxyPaths = [
  'server/api/public/activity-assets/[assetId].get.ts',
  'server/api/public/files/[id]/download.get.ts',
  'server/api/public/assets/posts/[id]/cover.get.ts',
  'server/api/public/assets/years/[id]/cover.get.ts'
]
const adminProxyPaths = [
  'server/api/admin/activity-assets/[assetId]/file.get.ts',
  'server/api/admin/files/[id]/download.get.ts',
  'server/api/admin/posts/[id]/cover.get.ts',
  'server/api/admin/years/[id]/cover.get.ts'
]
for (const path of [...publicProxyPaths, ...adminProxyPaths]) {
  const body = await readFile(resolve(root, path), 'utf8')
  if (!body.includes('defineStorageProxyHandler') || !body.includes('sendStorageProxyObject')
    || body.includes('sendRedirect') || body.includes('signedUrl')) {
    throw new Error(`Storage route does not preserve the same-origin byte proxy boundary: ${path}`)
  }
}
const storageProxy = await readFile(resolve(root, 'server/utils/storageProxy.ts'), 'utf8')
if (!storageProxy.includes(".download(input.path)") || !storageProxy.includes("'Cross-Origin-Resource-Policy'")
  || !storageProxy.includes("crypto.subtle.digest('SHA-256'") || !storageProxy.includes('hasSafeSignature')
  || !storageProxy.includes('setStorageProxyHeaders(event)')) {
  throw new Error('Public Storage proxy lacks direct download, same-origin, hash, or magic-byte integrity enforcement')
}
const [securityMiddleware, securityPlugin, nuxtConfig] = await Promise.all([
  readFile(resolve(root, 'server/middleware/01-security-headers.ts'), 'utf8'),
  readFile(resolve(root, 'server/plugins/phase10-security.ts'), 'utf8'),
  readFile(resolve(root, 'nuxt.config.ts'), 'utf8')
])
for (const fragment of ['activity-assets', 'assets\\/(?:posts|years)', 'files\\/[^/]+\\/download']) {
  if (!securityMiddleware.includes(fragment) || !securityPlugin.includes(fragment)) {
    throw new Error(`Asset-proxy error cache boundary is missing: ${fragment}`)
  }
}
for (const route of ['/api/public/activity-assets/**', '/api/public/files/**/download', '/api/public/assets/posts/**/cover', '/api/public/assets/years/**/cover']) {
  if (!nuxtConfig.includes(`'${route}': { headers: { 'cache-control': 'private, no-store, max-age=0' } }`)) {
    throw new Error(`Asset-proxy route rule is missing: ${route}`)
  }
}
const requiredOperationalFiles = [
  'scripts/phase10/synthetic-check.mjs',
  'docs/phase10-backup-restore-runbook.md',
  'docs/phase10-editorial-release-runbook.md',
  'docs/phase10-environments-deployment-runbook.md',
  'docs/phase10-incident-monitoring-runbook.md',
  'docs/phase10-rollback-runbook.md'
]
for (const path of requiredOperationalFiles) {
  const body = await readFile(resolve(root, path), 'utf8')
  if (body.length < 500) throw new Error(`Phase 10 operational contract is missing or incomplete: ${path}`)
}
console.log(JSON.stringify({
  status: 'passed', baseline, phase9: { drafts: 70, reviews: 122, redirects: 83 },
  phase10: { functions: new Set(functionNames).size, privateTables: expectedTables.length, redirectConfigSha256: sha256(config) },
  secretHits: 0, bannedArtifacts: 0
}, null, 2))
