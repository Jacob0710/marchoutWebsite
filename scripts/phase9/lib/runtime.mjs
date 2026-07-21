import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { appCommit, cacheDir, prettyJson, readJson, sha256, writeJson, writeJsonl } from './core.mjs'

export const baseUrl = process.env.PHASE9_BASE_URL || process.env.PHASE8_BASE_URL || process.env.PHASE6_BASE_URL || 'http://127.0.0.1:3000'
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const adminEmail = process.env.PHASE9_ADMIN_EMAIL || process.env.PHASE8_ADMIN_EMAIL || process.env.PHASE6_ADMIN_EMAIL
const adminPassword = process.env.PHASE9_ADMIN_PASSWORD || process.env.PHASE8_ADMIN_PASSWORD || process.env.PHASE6_ADMIN_PASSWORD

export const requireRuntimeEnv = () => {
  for (const [name, value] of Object.entries({ supabaseUrl, supabaseAnonKey, adminEmail, adminPassword })) {
    if (!value) throw new Error(`Missing Phase 9 runtime configuration: ${name}`)
  }
}

const cookieHeader = (cookies) => [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
const updateJar = (cookies, response) => {
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(';')
    const separator = pair.indexOf('=')
    if (separator < 1) continue
    const name = pair.slice(0, separator)
    const content = pair.slice(separator + 1)
    if (content) cookies.set(name, content)
    else cookies.delete(name)
  }
}

export const createAppSession = async () => {
  requireRuntimeEnv()
  const cookies = new Map()
  const request = async (path, options = {}) => {
    const headers = new Headers(options.headers)
    if (cookies.size) headers.set('cookie', cookieHeader(cookies))
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual' })
    updateJar(cookies, response)
    return response
  }
  const json = async (path, method = 'GET', body) => request(path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const upload = async (path, filename, type, bytes, fields = {}) => {
    const body = new FormData()
    for (const [key, value] of Object.entries(fields)) body.append(key, String(value))
    body.append('file', new Blob([bytes], { type }), filename)
    return request(path, { method: 'POST', body })
  }
  const login = await json('/api/admin/login', 'POST', { email: adminEmail, password: adminPassword })
  if (login.status !== 200) throw new Error(`Active-admin Server API login failed with ${login.status}`)
  return { request, json, upload, cookies }
}

export const createAdminClient = async () => {
  requireRuntimeEnv()
  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { error } = await client.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
  if (error) throw new Error(`Active-admin RPC login failed: ${error.message}`)
  return client
}

export const expectStatus = async (response, expected, label) => {
  if (response.status !== expected) {
    const body = (await response.text()).slice(0, 500)
    throw new Error(`${label} returned ${response.status}, expected ${expected}: ${body}`)
  }
  return response
}

export const responseJson = async (response, expected, label) => (await expectStatus(response, expected, label)).json()

export const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,8,215,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,78,68,174,66,96,130])
export const textFile = new TextEncoder().encode('Phase 9 synthetic private download fixture.\n')

export const syntheticItems = [
  { sourceKind: 'activity', sourceKey: 'synthetic:activity:controlled-migration', targetKind: 'activity', naturalKey: 'phase9-synthetic-activity', payload: { title: 'Phase 9 synthetic activity', slug: 'phase9-synthetic-activity', academicYear: 199, activityType: 'project', eventDate: '2026-07-21', location: 'Synthetic test location', participantsCount: 1, resultSummary: 'Synthetic migration verification.', content: 'Synthetic plain-text content used only for Phase 9 rollback verification.', isFeatured: false, tags: ['phase9-synthetic'] } },
  { sourceKind: 'post', sourceKey: 'synthetic:post:controlled-migration', targetKind: 'post', naturalKey: 'phase9-synthetic-post', payload: { title: 'Phase 9 synthetic post', slug: 'phase9-synthetic-post', excerpt: 'Synthetic migration verification.', content: 'Synthetic plain-text post used only for Phase 9 rollback verification.', coverAlt: 'Synthetic one-pixel test cover', isFeatured: false } },
  { sourceKind: 'file', sourceKey: 'synthetic:file:controlled-migration', targetKind: 'file', naturalKey: 'phase9-synthetic-file', payload: { title: 'Phase 9 synthetic file', description: 'Synthetic private download used only for rollback verification.', academicYear: 199, category: 'phase9-test', sortOrder: 999 } },
  { sourceKind: 'faq', sourceKey: 'synthetic:faq:controlled-migration', targetKind: 'faq', naturalKey: 'phase9-synthetic-faq', payload: { question: 'Phase 9 synthetic FAQ?', answer: 'Synthetic answer used only for rollback verification.', sortOrder: 999, isActive: true } },
  { sourceKind: 'year-summary', sourceKey: 'synthetic:year:controlled-migration', targetKind: 'year-summary', naturalKey: '199', payload: { academicYear: 199, title: 'Phase 9 synthetic year', theme: 'Synthetic test', summary: 'Synthetic annual summary used only for rollback verification.', highlights: ['Synthetic highlight'], statistics: [{ label: 'Synthetic', value: '1' }], coverAlt: 'Synthetic one-pixel test cover', sortOrder: 999 } }
].map((item) => ({ ...item, sourceHash: sha256(item), normalizedHash: sha256(item.payload) }))

export const syntheticSnapshotHash = sha256(syntheticItems)
export const syntheticRunKey = `phase9-synthetic-${syntheticSnapshotHash.slice(0, 24)}`
export const statePath = resolve(cacheDir, 'synthetic-state.json')

export const readState = async () => {
  try { return JSON.parse(await readFile(statePath, 'utf8')) } catch { return null }
}
export const writeState = (state) => writeJson('.phase9-cache/synthetic-state.json', state)
export const writeRuntimeResult = (name, result) => writeJson(`.phase9-cache/${name}-result.json`, result)

export const rpc = async (client, name, args) => {
  const { data, error } = await client.rpc(name, args)
  if (error) throw new Error(`${name} failed: ${error.message}`)
  return data
}

export const beginSyntheticRun = async (client) => rpc(client, 'phase9_begin_migration_run', {
  p_run_key: syntheticRunKey,
  p_source_system: 'synthetic',
  p_source_snapshot_sha256: syntheticSnapshotHash,
  p_app_commit_sha: await appCommit(),
  p_mode: 'apply'
})

export const sourceRef = async (client, item) => {
  const data = await rpc(client, 'phase9_get_source_ref', { p_source_system: 'synthetic', p_source_kind: item.sourceKind, p_source_key: item.sourceKey })
  return data?.[0] ?? null
}

export const recordRef = (client, runId, item, targetId, operation = 'create') => rpc(client, 'phase9_record_source_ref', {
  p_migration_run_id: runId,
  p_source_system: 'synthetic',
  p_source_kind: item.sourceKind,
  p_source_key: item.sourceKey,
  p_source_url: null,
  p_source_sha256: item.sourceHash,
  p_normalized_sha256: item.normalizedHash,
  p_target_kind: item.targetKind,
  p_target_id: targetId,
  p_target_natural_key: item.naturalKey,
  p_operation: operation
})

export const finishRun = (client, runId, status, summary) => rpc(client, 'phase9_finish_migration_run', { p_run_id: runId, p_status: status, p_summary: summary })

export const safeResult = (result) => JSON.parse(prettyJson(result))
export const updateRollbackManifest = async (state) => {
  if (state.rolledBack) {
    await writeJsonl('migration/phase9/rollback-manifest.jsonl', [{
      runKey: state.runKey,
      sourceSystem: 'synthetic',
      action: 'synthetic-cleanup-complete',
      status: 'rolled-back',
      ...state.rollbackResult
    }])
    return
  }
  const order = ['year-summary', 'faq', 'file', 'post', 'activity']
  const rows = order.flatMap((kind) => Object.entries(state.targets || {}).filter(([, value]) => value.kind === kind).map(([sourceKey, value]) => ({ runKey: state.runKey, sourceKey, targetKind: kind, targetId: value.id, action: 'delete-synthetic-target', createdByRun: true })))
  await writeJsonl('migration/phase9/rollback-manifest.jsonl', rows)
}
