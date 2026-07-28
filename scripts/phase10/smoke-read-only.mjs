import { createClient } from '@supabase/supabase-js'
import { readJson } from './lib/core.mjs'

const baseUrl = process.env.PHASE10_BASE_URL || 'http://127.0.0.1:3000'
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const adminEmail = process.env.PHASE10_ADMIN_EMAIL || process.env.PHASE6_ADMIN_EMAIL || process.env.PHASE5_ADMIN_EMAIL
const adminPassword = process.env.PHASE10_ADMIN_PASSWORD || process.env.PHASE6_ADMIN_PASSWORD || process.env.PHASE5_ADMIN_PASSWORD
const nonAdminEmail = process.env.PHASE10_INACTIVE_ADMIN_EMAIL || process.env.PHASE6_NON_ADMIN_EMAIL || process.env.PHASE5_NON_ADMIN_EMAIL
const nonAdminPassword = process.env.PHASE10_INACTIVE_ADMIN_PASSWORD || process.env.PHASE6_NON_ADMIN_PASSWORD || process.env.PHASE5_NON_ADMIN_PASSWORD
for (const [key, value] of Object.entries({ supabaseUrl, supabaseAnonKey, adminEmail, adminPassword, nonAdminEmail, nonAdminPassword })) {
  if (!value) throw new Error(`Missing Phase 10 smoke configuration: ${key}`)
}

const assert = (condition, message) => { if (!condition) throw new Error(message) }
const cookieHeader = (jar) => [...jar].map(([key, value]) => `${key}=${value}`).join('; ')
const updateCookies = (jar, response) => {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';'); const separator = pair.indexOf('=')
    if (separator < 1) continue
    const key = pair.slice(0, separator); const value = pair.slice(separator + 1)
    if (value) jar.set(key, value); else jar.delete(key)
  }
}
const request = async (path, options = {}, jar) => {
  const headers = new Headers(options.headers)
  if (jar?.size) headers.set('cookie', cookieHeader(jar))
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual', signal: AbortSignal.timeout(15000) })
  if (jar) updateCookies(jar, response)
  return response
}
const jsonRequest = (path, method, body, jar, origin = new URL(baseUrl).origin) => request(path, {
  method, headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body)
}, jar)
const login = (email, password, jar) => jsonRequest('/api/admin/login', 'POST', { email, password }, jar)

const health = await request('/api/health')
const ready = await request('/api/health/ready')
assert(health.status === 200 && (await health.json()).status === 'ok', 'Liveness failed')
assert(ready.status === 200 && (await ready.json()).status === 'ready', 'Readiness failed')
assert(health.headers.get('cache-control')?.includes('no-store'), 'Health response is cacheable')

const anonQueue = await request('/api/admin/editorial')
assert(anonQueue.status === 401, 'Anonymous editorial queue was not denied')
const anonFiles = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
assert(Boolean((await anonFiles.from('files').select('id').limit(1)).error), 'Anon retains direct file-table access')
assert(Boolean((await anonFiles.from('activity_assets').select('id').limit(1)).error), 'Anon retains direct asset-table access')

const nonAdminJar = new Map()
const nonAdminLogin = await login(nonAdminEmail, nonAdminPassword, nonAdminJar)
assert(nonAdminLogin.status === 403 && nonAdminJar.size > 0, 'Authenticated non-admin login boundary failed')
assert((await request('/api/admin/editorial', {}, nonAdminJar)).status === 403, 'Non-admin can read editorial queue')
const nonAdminClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
assert(!(await nonAdminClient.auth.signInWithPassword({ email: nonAdminEmail, password: nonAdminPassword })).error, 'Non-admin direct sign-in failed')
assert(Boolean((await nonAdminClient.rpc('phase10_list_redirects')).error), 'Non-admin can invoke editorial redirect RPC')
const nonAdminFiles = await nonAdminClient.from('files').select('id,storage_path').limit(1)
const nonAdminAssets = await nonAdminClient.from('activity_assets').select('id,storage_path').limit(1)
assert(Boolean(nonAdminFiles.error) || nonAdminFiles.data?.length === 0, 'Non-admin can read raw file metadata')
assert(Boolean(nonAdminAssets.error) || nonAdminAssets.data?.length === 0, 'Non-admin can read raw activity-asset metadata')
await nonAdminClient.auth.signOut({ scope: 'local' })

const adminJar = new Map()
const adminLogin = await login(adminEmail, adminPassword, adminJar)
assert(adminLogin.status === 200 && adminJar.size > 0, 'Active admin login failed')
const queue = await request('/api/admin/editorial?limit=100&offset=0', {}, adminJar)
assert(queue.status === 200, 'Admin editorial queue failed')
const queueBody = await queue.json()
assert(queueBody.total === 122 && queueBody.items.length === 100, 'Editorial review coverage mismatch')
assert(queueBody.reconciliation.targets.total === 70 && queueBody.reconciliation.redirects.total === 83, 'Editorial reconciliation mismatch')
const reviewKey = queueBody.items[0]?.reviewKey
assert(/^P9-[0-9]{4}$/.test(reviewKey), 'Editorial queue lacks a stable review key')
const detailResponse = await request(`/api/admin/editorial/${reviewKey}`, {}, adminJar)
assert(detailResponse.status === 200, 'Editorial detail failed')
const detail = (await detailResponse.json()).item
assert(detail.review.reviewKey === reviewKey && !JSON.stringify(detail).includes('PHASE10_PRIVACY_FIXTURE_'), 'Editorial detail is invalid or leaked fixture token')

const sameOrigin = await jsonRequest(`/api/admin/editorial/${reviewKey}`, 'PATCH', {}, adminJar, 'https://cross-origin.invalid')
assert(sameOrigin.status === 403, 'Cross-origin editorial mutation was not rejected')
const sameOriginBody = await sameOrigin.json()
assert(sameOriginBody?.data?.code === 'ADMIN_REQUIRED' || sameOriginBody?.code === 'ADMIN_REQUIRED', 'Cross-origin response lacks a stable code')

const config = await readJson('migration/phase10/redirect-config.json')
const draftRedirect = config.entries.find((item) => item.phase9Disposition === 'draft-target')
assert(draftRedirect && !draftRedirect.active, 'No inactive draft-target fixture exists')
const draftTarget = await request(draftRedirect.targetPath)
assert(draftTarget.status === 404, 'A deferred draft target is public')
let draftAssetId
for (const candidate of queueBody.items.filter((item) => item.targetKind === 'activity')) {
  const response = await request(`/api/admin/editorial/${candidate.reviewKey}`, {}, adminJar)
  assert(response.status === 200, 'Activity editorial detail failed')
  draftAssetId = (await response.json()).item.assets?.[0]?.id
  if (draftAssetId) break
}
assert(draftAssetId, 'No imported draft asset fixture was found')
const draftAsset = await request(`/api/public/activity-assets/${draftAssetId}`)
assert(draftAsset.status === 404, 'Draft asset proxy is public')
assert(!draftAsset.headers.has('location'), 'Draft asset proxy exposed a redirect')
assert(draftAsset.headers.get('cache-control')?.includes('no-store'), 'Draft asset 404 is cacheable')
assert(draftAsset.headers.get('cross-origin-resource-policy') === 'same-origin', 'Draft asset lacks same-origin CORP')
const adminAsset = await request(`/api/admin/activity-assets/${draftAssetId}/file`, {}, adminJar)
assert(adminAsset.status === 200 && !adminAsset.headers.has('location'), 'Admin asset byte proxy failed')
assert(adminAsset.headers.get('cache-control')?.includes('no-store'), 'Admin asset response is cacheable')
assert(adminAsset.headers.get('cross-origin-resource-policy') === 'same-origin', 'Admin asset lacks same-origin CORP')
const expectedLength = Number(adminAsset.headers.get('content-length'))
const receivedLength = (await adminAsset.arrayBuffer()).byteLength
assert(Number.isSafeInteger(expectedLength) && expectedLength > 0 && expectedLength === receivedLength, 'Admin asset byte count mismatch')

const adminPage = await request('/admin/editorial', {}, adminJar)
assert(adminPage.status === 200 && adminPage.headers.get('cache-control')?.includes('no-store'), 'Admin page/cache boundary failed')
assert(adminPage.headers.has('content-security-policy-report-only') && adminPage.headers.get('x-content-type-options') === 'nosniff', 'Security headers are missing')
const logout = await jsonRequest('/api/admin/logout', 'POST', {}, adminJar)
assert(logout.status === 200 && (await request('/api/admin/editorial', {}, adminJar)).status === 401, 'Logout/session invalidation failed')

console.log(JSON.stringify({
  status: 'passed', identities: ['anon', 'non-admin', 'active-admin'], reviews: 122, targets: 70, redirects: 83,
  remoteMutations: 0, coverage: ['health', 'RLS/grants', 'queue/detail', 'same-origin', 'draft/admin byte proxy', 'headers/cache', 'logout']
}, null, 2))
