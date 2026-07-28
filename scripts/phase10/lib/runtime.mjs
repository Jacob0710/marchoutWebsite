import { createClient } from '@supabase/supabase-js'

export const baseUrl = process.env.PHASE10_BASE_URL || process.env.PHASE9_BASE_URL || process.env.PHASE8_BASE_URL || process.env.PHASE6_BASE_URL || 'http://127.0.0.1:3000'
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const adminEmail = process.env.PHASE10_ADMIN_EMAIL || process.env.PHASE9_ADMIN_EMAIL || process.env.PHASE8_ADMIN_EMAIL || process.env.PHASE6_ADMIN_EMAIL
const adminPassword = process.env.PHASE10_ADMIN_PASSWORD || process.env.PHASE9_ADMIN_PASSWORD || process.env.PHASE8_ADMIN_PASSWORD || process.env.PHASE6_ADMIN_PASSWORD

export const requireRuntime = () => {
  for (const [name, value] of Object.entries({ supabaseUrl, supabaseAnonKey, adminEmail, adminPassword })) {
    if (!value) throw new Error(`Missing Phase 10 runtime configuration: ${name}`)
  }
}

const cookieHeader = (cookies) => [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
const updateCookies = (cookies, response) => {
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(';'); const separator = pair.indexOf('=')
    if (separator < 1) continue
    const name = pair.slice(0, separator); const content = pair.slice(separator + 1)
    if (content) cookies.set(name, content); else cookies.delete(name)
  }
}

export const createAppSession = async () => {
  requireRuntime()
  const cookies = new Map()
  const origin = new URL(baseUrl).origin
  const request = async (path, options = {}) => {
    const headers = new Headers(options.headers)
    if (cookies.size) headers.set('cookie', cookieHeader(cookies))
    if (options.method && options.method !== 'GET' && options.method !== 'HEAD') headers.set('origin', origin)
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual' })
    updateCookies(cookies, response)
    return response
  }
  const json = (path, method = 'GET', body) => request(path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const login = await json('/api/admin/login', 'POST', { email: adminEmail, password: adminPassword })
  if (login.status !== 200) throw new Error(`Active-admin Server API login failed with ${login.status}`)
  return { request, json, cookies }
}

export const createAdminClient = async () => {
  requireRuntime()
  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { error } = await client.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
  if (error) throw new Error(`Active-admin read session failed: ${error.message}`)
  return client
}

export const responseJson = async (response, expected, label) => {
  if (response.status !== expected) {
    const body = (await response.text()).slice(0, 500)
    throw new Error(`${label} returned ${response.status}, expected ${expected}: ${body}`)
  }
  return response.json()
}

export const requireMutationEvidence = () => {
  const evidence = {
    backupCheckpointId: process.env.PHASE10_BACKUP_CHECKPOINT_ID,
    databaseEvidenceSha256: process.env.PHASE10_DATABASE_EVIDENCE_SHA256,
    storageInventorySha256: process.env.PHASE10_STORAGE_INVENTORY_SHA256,
    restoreEvidenceSha256: process.env.PHASE10_RESTORE_EVIDENCE_SHA256,
    restoreRehearsedAt: process.env.PHASE10_RESTORE_REHEARSED_AT
  }
  for (const [name, value] of Object.entries(evidence)) if (!value) throw new Error(`Remote mutation blocked: missing ${name}`)
  for (const [name, value] of Object.entries(evidence).filter(([name]) => name.endsWith('Sha256'))) {
    if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`Remote mutation blocked: invalid ${name}`)
  }
  if (Number.isNaN(Date.parse(evidence.restoreRehearsedAt)) || Date.parse(evidence.restoreRehearsedAt) > Date.now()) throw new Error('Remote mutation blocked: invalid restore rehearsal time')
  return evidence
}
