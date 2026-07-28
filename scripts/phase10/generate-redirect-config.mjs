import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  canonicalize,
  encodedLegacyPathForSource,
  phase9SnapshotSha256,
  readCsv,
  redirectKeyForSource,
  root,
  sha256,
  writePrivateJson
} from './lib/core.mjs'

const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const mode = option('mode') || 'dry-run'
const statePath = option('state') || 'migration/phase10/redirect-decisions.json'
const stage = option('stage') || 'inactive-baseline'
const canonicalOriginInput = option('canonical-origin') || ''
const sourceHostsInput = option('source-hosts') || ''
const candidatePath = option('candidate') || '.phase10-private/redirect-config-candidate.json'
const checkpointPath = option('checkpoint') || ''
const trackedPath = 'migration/phase10/redirect-config.json'
if (!['dry-run', 'generate', 'promote', 'resume', 'rollback'].includes(mode)) throw new Error(`Unsupported redirect config mode: ${mode}`)

const parseOrigin = (value, required) => {
  if (!value && !required) return null
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('Canonical origin must be an origin-only HTTPS URL')
  }
  return url.origin
}
const parseHosts = (value) => value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
const normalizeEncodedPath = (value) => value.replace(/%[0-9a-f]{2}/gi, (item) => item.toUpperCase())
const forbiddenTarget = (path) => ['/admin', '/api', '/auth', '/_nuxt'].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))

const validateConfig = (config) => {
  if (config.schemaVersion !== 1 || config.sourceSnapshotSha256 !== phase9SnapshotSha256 || !Array.isArray(config.entries) || config.entries.length !== 83) {
    throw new Error('Redirect config baseline or cardinality mismatch')
  }
  if (new Set(config.entries.map((item) => item.redirectKey)).size !== 83
    || new Set(config.entries.map((item) => item.sourceEncodedPath)).size !== 83) {
    throw new Error('Duplicate redirect key or source path')
  }
  const active = config.entries.filter((item) => item.active)
  if (active.length) {
    const origin = parseOrigin(config.canonicalOrigin, true)
    if (!Array.isArray(config.sourceHosts) || !config.sourceHosts.length || new Set(config.sourceHosts).size !== config.sourceHosts.length) {
      throw new Error('Active redirect config requires unique explicit source hosts')
    }
    const activeSources = new Set(active.map((item) => item.sourceEncodedPath))
    const canonicalHost = new URL(origin).host.toLowerCase()
    for (const item of active) {
      if (item.statusCode !== 301 || typeof item.targetPath !== 'string' || !item.targetPath.startsWith('/')
        || item.targetPath.startsWith('//') || forbiddenTarget(item.targetPath)) throw new Error(`Unsafe target for ${item.redirectKey}`)
      const final = new URL(item.verifiedFinalUrl)
      if (item.targetVerified !== true || item.verifiedFinalStatus !== 200 || item.verifiedHops !== 1
        || item.verifiedOrigin !== origin || final.origin !== origin || final.pathname !== item.targetPath
        || final.search || final.hash || !item.targetVersion) throw new Error(`Incomplete one-hop final-200 evidence for ${item.redirectKey}`)
      if (item.phase9Disposition === 'draft-target'
        && (item.reviewState !== 'resolved' || item.reviewDecision !== 'activate-redirect' || item.publicTargetVerified !== true)) {
        throw new Error(`Draft-target review evidence is incomplete for ${item.redirectKey}`)
      }
      if (config.sourceHosts.includes(canonicalHost)
        && (normalizeEncodedPath(item.sourceEncodedPath) === normalizeEncodedPath(encodeURI(item.targetPath))
          || activeSources.has(normalizeEncodedPath(encodeURI(item.targetPath))))) {
        throw new Error(`Redirect loop or chain on canonical host for ${item.redirectKey}`)
      }
    }
  }
  if (config.entries.some((item) => item.phase9Disposition === 'utility-archive' && (item.active || item.statusCode !== null || item.targetPath !== null))) {
    throw new Error('Utility archive must remain inactive without 301 or 410')
  }
  return config
}

const buildConfig = async () => {
  const rows = await readCsv('migration/phase9/url-redirects.csv')
  const state = await readJson(statePath)
  const decisions = state.decisions || state.items || state.redirects
  if (rows.length !== 83 || !Array.isArray(decisions) || decisions.length !== 83) throw new Error('Redirect state must reconcile exactly 83 rows')
  const decisionByKey = new Map(decisions.map((item) => [item.redirectKey, item]))
  if (decisionByKey.size !== 83) throw new Error('Redirect state has duplicate redirect keys')
  const requestedActive = decisions.filter((item) => item.decision === 'activate').length
  const canonicalOrigin = parseOrigin(canonicalOriginInput || state.canonicalOrigin || '', requestedActive > 0)
  const sourceHosts = parseHosts(sourceHostsInput || (Array.isArray(state.sourceHosts) ? state.sourceHosts.join(',') : ''))
  if (sourceHosts.some((host) => host.includes('/') || host.includes(':') && !/^\[[0-9a-f:]+\](?::\d+)?$/i.test(host) && !/^[a-z0-9.-]+:\d+$/.test(host))) {
    throw new Error('Source hosts must be host names, not URLs or paths')
  }
  const entries = rows.map((row) => {
    const redirectKey = redirectKeyForSource(row.source_key, row.source_path)
    const decision = decisionByKey.get(redirectKey)
    const disposition = !row.target_path ? 'utility-archive' : Number(row.status_code) === 301 ? 'structural-candidate' : 'draft-target'
    if (!decision || decision.sourceKey !== row.source_key || decision.sourcePath !== row.source_path
      || decision.targetPath !== (row.target_path || null) || decision.phase9Disposition !== disposition) {
      throw new Error(`Redirect decision does not match Phase 9 manifest: ${redirectKey}`)
    }
    if (!['activate', 'keep-inactive', 'archive'].includes(decision.decision)) throw new Error(`Redirect lacks an explicit decision: ${redirectKey}`)
    if (disposition === 'utility-archive' && decision.decision !== 'archive') throw new Error(`Utility redirect must archive: ${redirectKey}`)
    const active = decision.decision === 'activate'
    return {
      redirectKey,
      sourceKey: row.source_key,
      sourcePath: row.source_path,
      sourceEncodedPath: encodedLegacyPathForSource(row.source_path),
      targetPath: row.target_path || null,
      phase9Disposition: disposition,
      decision: decision.decision,
      decisionReasonCode: decision.reasonCode || null,
      active,
      statusCode: active ? 301 : disposition === 'utility-archive' ? null : 301,
      targetVersion: decision.targetVersion || null,
      targetVerified: decision.targetVerified === true,
      verifiedOrigin: decision.verifiedOrigin || null,
      verifiedFinalUrl: decision.verifiedFinalUrl || null,
      verifiedFinalStatus: decision.verifiedFinalStatus ?? null,
      verifiedHops: decision.verifiedHops ?? null,
      verifiedAt: decision.verifiedAt || null,
      reviewKey: decision.reviewKey || null,
      reviewState: decision.reviewState || null,
      reviewDecision: decision.reviewDecision || null,
      publicTargetVerified: decision.publicTargetVerified === true
    }
  }).sort((left, right) => left.sourceEncodedPath.localeCompare(right.sourceEncodedPath, 'en') || left.redirectKey.localeCompare(right.redirectKey, 'en'))
  const evidenceTimes = decisions.flatMap((item) => [item.verifiedAt, item.decidedAt]).filter(Boolean).sort()
  return validateConfig({
    schemaVersion: 1,
    sourceSnapshotSha256: phase9SnapshotSha256,
    stage: requestedActive ? stage : 'inactive-baseline',
    canonicalOrigin,
    sourceHosts,
    preserveQuery: true,
    generatedAt: evidenceTimes.at(-1) || '2026-07-22T00:00:00.000Z',
    entries
  })
}

if (mode === 'rollback') {
  if (!checkpointPath) throw new Error('--checkpoint is required for rollback')
  const checkpoint = validateConfig(await readJson(checkpointPath))
  const checkpointSha256 = sha256(checkpoint)
  if (process.env.PHASE10_REDIRECT_ROLLBACK_CONFIRM !== checkpointSha256) throw new Error('PHASE10_REDIRECT_ROLLBACK_CONFIRM must equal the checkpoint SHA-256')
  await writeFile(resolve(root, trackedPath), `${JSON.stringify(canonicalize(checkpoint), null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ mode, status: 'rolled-back', checkpointSha256, entries: checkpoint.entries.length }, null, 2))
  process.exit(0)
}

const config = await buildConfig()
const configSha256 = sha256(config)
const summary = {
  mode,
  status: 'validated',
  configSha256,
  total: config.entries.length,
  active: config.entries.filter((item) => item.active).length,
  inactive: config.entries.filter((item) => !item.active && item.phase9Disposition !== 'utility-archive').length,
  archived: config.entries.filter((item) => item.phase9Disposition === 'utility-archive').length,
  databaseMutations: 0,
  storageMutations: 0
}
if (mode === 'dry-run') {
  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
}
if (mode === 'generate') {
  await writePrivateJson(candidatePath, config)
  console.log(JSON.stringify({ ...summary, status: 'candidate-written', candidatePath }, null, 2))
  process.exit(0)
}

if (process.env.PHASE10_REDIRECT_PROMOTE_CONFIRM !== configSha256) throw new Error('PHASE10_REDIRECT_PROMOTE_CONFIRM must equal the candidate SHA-256')
const existing = validateConfig(await readJson(trackedPath))
const existingSha256 = sha256(existing)
if (existingSha256 === configSha256) {
  console.log(JSON.stringify({ ...summary, status: 'already-current', idempotent: true }, null, 2))
  process.exit(0)
}
const backupPath = `.phase10-private/redirect-config-checkpoints/${existingSha256}.json`
await mkdir(dirname(resolve(root, backupPath)), { recursive: true })
await writePrivateJson(backupPath, existing)
await writeFile(resolve(root, trackedPath), `${JSON.stringify(canonicalize(config), null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ ...summary, status: 'promoted', idempotent: false, checkpoint: backupPath }, null, 2))
