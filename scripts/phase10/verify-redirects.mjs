import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { encodedLegacyPathForSource, phase9SnapshotSha256, readCsv, redirectKeyForSource, root, sha256, writePrivateJson } from './lib/core.mjs'

const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const mode = option('mode') || 'static'
const configPath = option('config') || 'migration/phase10/redirect-config.json'
const evidencePath = option('evidence') || '.phase10-private/redirect-http-verification.json'
if (!['static', 'http'].includes(mode)) throw new Error(`Unsupported redirect verification mode: ${mode}`)
const config = JSON.parse(await readFile(resolve(root, configPath), 'utf8'))
const rows = await readCsv('migration/phase9/url-redirects.csv')

if (config.schemaVersion !== 1 || config.sourceSnapshotSha256 !== phase9SnapshotSha256 || config.entries?.length !== 83 || rows.length !== 83) {
  throw new Error('Redirect config baseline/cardinality mismatch')
}
if (new Set(config.entries.map((item) => item.redirectKey)).size !== 83
  || new Set(config.entries.map((item) => item.sourceEncodedPath)).size !== 83) throw new Error('Duplicate redirect key/path')
const configByKey = new Map(config.entries.map((item) => [item.redirectKey, item]))
for (const row of rows) {
  const key = redirectKeyForSource(row.source_key, row.source_path)
  const item = configByKey.get(key)
  const disposition = !row.target_path ? 'utility-archive' : Number(row.status_code) === 301 ? 'structural-candidate' : 'draft-target'
  if (!item || item.sourceKey !== row.source_key || item.sourcePath !== row.source_path
    || item.sourceEncodedPath !== encodedLegacyPathForSource(row.source_path)
    || item.targetPath !== (row.target_path || null) || item.phase9Disposition !== disposition) {
    throw new Error(`Redirect config diverges from Phase 9 manifest: ${key}`)
  }
}
const active = config.entries.filter((item) => item.active)
const inactiveDrafts = config.entries.filter((item) => item.phase9Disposition === 'draft-target' && !item.active)
const archives = config.entries.filter((item) => item.phase9Disposition === 'utility-archive')
if (archives.length !== 2 || archives.some((item) => item.active || item.statusCode !== null || item.targetPath !== null || item.decision !== 'archive')) {
  throw new Error('Utility archive contract failed')
}
if (config.entries.some((item) => item.statusCode === 410)) throw new Error('Unauthorized 410 found')
if (active.length) {
  const canonical = new URL(config.canonicalOrigin)
  if (canonical.protocol !== 'https:' || canonical.pathname !== '/' || !config.sourceHosts?.length) throw new Error('Active config lacks HTTPS canonical/source-host evidence')
  for (const item of active) {
    const final = new URL(item.verifiedFinalUrl)
    if (item.statusCode !== 301 || !item.targetPath || item.targetPath.startsWith('//')
      || ['/admin', '/api', '/auth'].some((prefix) => item.targetPath === prefix || item.targetPath.startsWith(`${prefix}/`))
      || !item.targetVerified || item.verifiedFinalStatus !== 200 || item.verifiedHops !== 1
      || item.verifiedOrigin !== canonical.origin || final.origin !== canonical.origin || final.pathname !== item.targetPath
      || (item.phase9Disposition === 'draft-target'
        && (item.reviewState !== 'resolved' || item.reviewDecision !== 'activate-redirect' || !item.publicTargetVerified))) {
      throw new Error(`Active redirect lacks approval/final-200 evidence: ${item.redirectKey}`)
    }
  }
}
const staticResult = {
  mode: 'static', status: 'passed', configSha256: sha256(config), total: 83,
  structural: config.entries.filter((item) => item.phase9Disposition === 'structural-candidate').length,
  draftTarget: config.entries.filter((item) => item.phase9Disposition === 'draft-target').length,
  archive: archives.length, active: active.length, inactiveDraftTarget: inactiveDrafts.length,
  unauthorized410: 0, duplicates: 0
}
if (mode === 'static') {
  console.log(JSON.stringify(staticResult, null, 2))
  process.exit(0)
}

const origin = new URL(option('origin') || '')
if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/') throw new Error('--origin must be an origin-only HTTP(S) URL')
if (active.length && !config.sourceHosts.map((item) => item.toLowerCase()).includes(origin.host.toLowerCase())) throw new Error('HTTP origin is not an approved redirect source host')
const request = async (url) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'phase10-redirect-verifier/1.0' } })
const evidence = []
for (const item of active) {
  const probe = `${origin.origin}${item.sourceEncodedPath}?phase10_redirect_probe=1`
  const sourceResponse = await request(probe)
  const location = sourceResponse.headers.get('location')
  const expected = `${config.canonicalOrigin}${item.targetPath}?phase10_redirect_probe=1`
  if (sourceResponse.status !== 301 || !location || new URL(location, probe).href !== expected) throw new Error(`301/Location/query verification failed: ${item.redirectKey}`)
  const finalResponse = await request(expected)
  if (finalResponse.status !== 200 || finalResponse.headers.has('location')) throw new Error(`One-hop final 200 verification failed: ${item.redirectKey}`)
  evidence.push({ redirectKey: item.redirectKey, sourceStatus: 301, finalStatus: 200, hops: 1, queryPreserved: true })
}
for (const item of [...inactiveDrafts, ...archives]) {
  const sourceResponse = await request(`${origin.origin}${item.sourceEncodedPath}`)
  if ((sourceResponse.status >= 300 && sourceResponse.status < 400) || (item.phase9Disposition === 'utility-archive' && sourceResponse.status === 410)) {
    throw new Error(`Inactive/archive source unexpectedly redirected or returned 410: ${item.redirectKey}`)
  }
  if (item.phase9Disposition === 'draft-target' && item.targetPath) {
    const targetResponse = await request(`${origin.origin}${item.targetPath}`)
    if (targetResponse.status !== 404) throw new Error(`Draft target is publicly reachable: ${item.redirectKey}`)
  }
  evidence.push({ redirectKey: item.redirectKey, sourceStatus: sourceResponse.status, inactive: true })
}
const result = {
  ...staticResult,
  mode: 'http',
  origin: origin.origin,
  status: 'passed',
  activeVerified: active.length,
  inactiveDraftVerified: inactiveDrafts.length,
  archivesVerified: archives.length,
  evidence
}
await writePrivateJson(evidencePath, result)
console.log(JSON.stringify({ ...result, evidence: undefined, evidencePath }, null, 2))
