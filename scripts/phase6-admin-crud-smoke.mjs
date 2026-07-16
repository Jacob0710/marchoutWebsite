import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.PHASE6_BASE_URL ?? 'http://127.0.0.1:3000'
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const nonAdminEmail = process.env.PHASE6_NON_ADMIN_EMAIL
const nonAdminPassword = process.env.PHASE6_NON_ADMIN_PASSWORD
const adminEmail = process.env.PHASE6_ADMIN_EMAIL
const adminPassword = process.env.PHASE6_ADMIN_PASSWORD
const required = { NUXT_PUBLIC_SUPABASE_URL: supabaseUrl, NUXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey, PHASE6_NON_ADMIN_EMAIL: nonAdminEmail, PHASE6_NON_ADMIN_PASSWORD: nonAdminPassword, PHASE6_ADMIN_EMAIL: adminEmail, PHASE6_ADMIN_PASSWORD: adminPassword }
for (const [name, value] of Object.entries(required)) if (!value) throw new Error(`Missing required test environment variable: ${name}`)

const assert = (condition, message) => { if (!condition) throw new Error(message) }
const jar = () => new Map()
const cookieHeader = (cookies) => [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
const updateCookies = (cookies, response) => {
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(';'); const separator = pair.indexOf('=')
    if (separator < 1) continue
    const name = pair.slice(0, separator); const content = pair.slice(separator + 1)
    if (content) cookies.set(name, content); else cookies.delete(name)
  }
}
const appFetch = async (path, options = {}, cookies) => {
  const headers = new Headers(options.headers)
  if (cookies?.size) headers.set('cookie', cookieHeader(cookies))
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual' })
  if (cookies) updateCookies(cookies, response)
  return response
}
const jsonRequest = (path, method, body, cookies, headers) => appFetch(path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }, cookies)
const login = (email, password, cookies) => jsonRequest('/api/admin/login', 'POST', { email, password }, cookies)
const directClient = () => createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const prefix = `phase6-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const adminCookies = jar()
let activityId = null
let imageAssetId = null
let attachmentAssetId = null
let passed = 0
const pass = (message) => { passed += 1; console.log(`PASS ${message}`) }

try {
  const anonClient = directClient()
  const { data: published, error: publishedError } = await anonClient.from('activities').select('slug').eq('status', 'published').limit(1).maybeSingle()
  assert(!publishedError, 'Anonymous published activity query failed.')
  if (published?.slug) assert((await appFetch(`/activities/${published.slug}`)).status === 200, 'Published public activity page failed.')
  pass('anonymous published content access')

  for (const [path, method] of [['/api/admin/activities', 'POST'], ['/api/admin/activities/00000000-0000-4000-8000-000000000000', 'PATCH'], ['/api/admin/activities/00000000-0000-4000-8000-000000000000', 'DELETE'], ['/api/admin/activities/00000000-0000-4000-8000-000000000000/publish', 'POST']]) {
    assert((await jsonRequest(path, method, {}, undefined)).status === 401, `Anonymous ${method} ${path} was not rejected.`)
  }
  pass('anonymous mutation rejection')

  const nonAdminCookies = jar()
  assert((await login(nonAdminEmail, nonAdminPassword, nonAdminCookies)).status === 403, 'Non-admin login boundary changed.')
  for (const [path, method] of [['/api/admin/activities', 'POST'], ['/api/admin/activities/00000000-0000-4000-8000-000000000000', 'PATCH'], ['/api/admin/activities/00000000-0000-4000-8000-000000000000', 'DELETE'], ['/api/admin/activities/00000000-0000-4000-8000-000000000000/publish', 'POST'], ['/api/admin/activities/00000000-0000-4000-8000-000000000000/assets', 'POST']]) {
    const response = method === 'POST' && path.endsWith('/assets') ? await appFetch(path, { method, body: new FormData() }, nonAdminCookies) : await jsonRequest(path, method, {}, nonAdminCookies)
    assert(response.status === 403, `Non-admin ${method} ${path} was not rejected.`)
  }
  pass('non-admin mutation rejection')

  assert((await login(adminEmail, adminPassword, adminCookies)).status === 200, 'Administrator login failed.')
  pass('administrator login')

  const createResponse = await jsonRequest('/api/admin/activities', 'POST', { title: prefix, slug: prefix }, adminCookies)
  assert(createResponse.status === 200, `Draft creation failed with ${createResponse.status}.`)
  const created = await createResponse.json(); activityId = created.activity.id
  assert(created.activity.status === 'draft', 'New activity was not a draft.')
  assert((await appFetch(`/activities/${prefix}`)).status === 404, 'Draft public page is visible.')
  pass('create draft and draft privacy')

  assert((await jsonRequest(`/api/admin/activities/${activityId}/publish`, 'POST', undefined, adminCookies)).status === 400, 'Incomplete draft publish did not return 400.')
  const completePayload = { title: `${prefix} complete`, slug: prefix, academicYear: 115, activityType: 'project', eventDate: '2026-07-15', location: 'Phase 6 smoke location', participantsCount: 12, resultSummary: 'Phase 6 smoke result summary.', content: 'Phase 6 smoke activity content used only for automated verification.', isFeatured: false, tags: ['phase6-smoke'] }
  assert((await jsonRequest(`/api/admin/activities/${activityId}`, 'PATCH', completePayload, adminCookies)).status === 200, 'Activity edit failed.')
  pass('edit and publish validation')

  const upload = async (kind, filename, type, bytes) => {
    const body = new FormData(); body.append('kind', kind); body.append('sortOrder', '1'); body.append('altText', 'Phase 6 smoke image'); body.append('file', new Blob([bytes], { type }), filename)
    return appFetch(`/api/admin/activities/${activityId}/assets`, { method: 'POST', body }, adminCookies)
  }
  const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,8,215,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,78,68,174,66,96,130])
  let response = await upload('image', 'phase6-smoke.png', 'image/png', png)
  assert(response.status === 200, `Image upload failed with ${response.status}.`); imageAssetId = (await response.json()).asset.id
  response = await upload('attachment', 'phase6-smoke.txt', 'text/plain', new TextEncoder().encode('Phase 6 smoke attachment.'))
  assert(response.status === 200, `Attachment upload failed with ${response.status}.`); attachmentAssetId = (await response.json()).asset.id
  assert((await jsonRequest(`/api/admin/activities/${activityId}/cover`, 'POST', { assetId: imageAssetId }, adminCookies)).status === 200, 'Set cover failed.')
  assert((await jsonRequest(`/api/admin/activities/${activityId}/videos`, 'POST', { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Phase 6 smoke video', sortOrder: 1 }, adminCookies)).status === 200, 'Video creation failed.')
  assert((await appFetch(`/api/admin/activity-assets/${imageAssetId}/file`, {}, adminCookies)).status === 302, 'Admin draft asset proxy failed.')
  assert((await appFetch(`/api/public/activity-assets/${imageAssetId}`)).status === 404, 'Draft asset is public.')
  pass('asset uploads, cover, video, and draft proxy boundaries')

  assert((await jsonRequest(`/api/admin/activities/${activityId}/publish`, 'POST', undefined, adminCookies)).status === 200, 'Publish failed.')
  assert((await appFetch(`/activities/${prefix}`)).status === 200, 'Published public page failed.')
  assert((await appFetch(`/api/public/activity-assets/${imageAssetId}`)).status === 302, 'Published asset proxy failed.')
  assert((await jsonRequest('/api/admin/activities', 'POST', { title: 'duplicate', slug: prefix }, adminCookies)).status === 409, 'Duplicate slug did not return 409.')
  pass('publish, public visibility, and duplicate slug')

  assert((await upload('attachment', 'bad.html', 'text/html', new TextEncoder().encode('<html></html>'))).status === 415, 'Unsupported MIME did not return 415.')
  const oversized = new Uint8Array(10 * 1024 * 1024 + 1); oversized.set(png.slice(0, 8))
  assert((await upload('image', 'large.png', 'image/png', oversized)).status === 413, 'Oversized image did not return 413.')
  pass('file validation')

  assert((await jsonRequest(`/api/admin/activities/${activityId}/unpublish`, 'POST', undefined, adminCookies)).status === 200, 'Unpublish failed.')
  assert((await appFetch(`/activities/${prefix}`)).status === 404, 'Unpublished page remains public.')
  assert((await appFetch(`/api/public/activity-assets/${imageAssetId}`)).status === 404, 'Unpublished asset remains public.')
  pass('unpublish privacy')

  const adminClient = directClient()
  assert(!(await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword })).error, 'Direct admin verification login failed.')
  assert((await appFetch(`/api/admin/activity-assets/${imageAssetId}`, { method: 'DELETE' }, adminCookies)).status === 200, 'Single asset delete failed.')
  const { data: deletedAsset } = await adminClient.from('activity_assets').select('id').eq('id', imageAssetId)
  const { data: remainingImages } = await adminClient.storage.from('activity-assets').list(`${activityId}/image`)
  assert(deletedAsset?.length === 0 && (remainingImages ?? []).length === 0, 'Single asset metadata or object remains.')
  imageAssetId = null
  pass('single asset metadata and object cleanup')

  assert((await appFetch(`/api/admin/activities/${activityId}`, { method: 'DELETE' }, adminCookies)).status === 200, 'Activity delete failed.')
  const [{ data: activityRows }, { data: assetRows }, { data: videoRows }, { data: imageObjects }, { data: attachmentObjects }] = await Promise.all([
    adminClient.from('activities').select('id').eq('id', activityId), adminClient.from('activity_assets').select('id').eq('activity_id', activityId), adminClient.from('activity_videos').select('id').eq('activity_id', activityId), adminClient.storage.from('activity-assets').list(`${activityId}/image`), adminClient.storage.from('activity-assets').list(`${activityId}/attachment`)
  ])
  assert(activityRows?.length === 0 && assetRows?.length === 0 && videoRows?.length === 0 && imageObjects?.length === 0 && attachmentObjects?.length === 0, 'Activity cleanup left data or Storage objects.')
  await adminClient.auth.signOut(); activityId = null; attachmentAssetId = null
  pass('activity cascade and Storage cleanup')

  assert((await appFetch('/api/admin/logout', { method: 'POST' }, adminCookies)).status === 200, 'Logout failed.')
  const afterLogout = await appFetch('/admin/activities', {}, adminCookies)
  assert(afterLogout.status === 302 && afterLogout.headers.get('location')?.startsWith('/admin/login'), 'Protected route remains visible after logout.')
  pass('logout and stale admin protection')
  console.log(`PASS Phase 6 smoke complete (${passed} groups); cleanup complete.`)
} finally {
  if (activityId && adminCookies.size) {
    try { await appFetch(`/api/admin/activities/${activityId}`, { method: 'DELETE' }, adminCookies) } catch { console.error('FAIL cleanup request could not be completed.') }
  }
}
