import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.PHASE8_BASE_URL ?? process.env.PHASE7_BASE_URL ?? process.env.PHASE6_BASE_URL ?? 'http://127.0.0.1:3000'
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const adminEmail = process.env.PHASE8_ADMIN_EMAIL ?? process.env.PHASE7_ADMIN_EMAIL ?? process.env.PHASE6_ADMIN_EMAIL
const adminPassword = process.env.PHASE8_ADMIN_PASSWORD ?? process.env.PHASE7_ADMIN_PASSWORD ?? process.env.PHASE6_ADMIN_PASSWORD
const inactiveEmail = process.env.PHASE8_INACTIVE_ADMIN_EMAIL ?? process.env.PHASE7_NON_ADMIN_EMAIL ?? process.env.PHASE6_NON_ADMIN_EMAIL
const inactivePassword = process.env.PHASE8_INACTIVE_ADMIN_PASSWORD ?? process.env.PHASE7_NON_ADMIN_PASSWORD ?? process.env.PHASE6_NON_ADMIN_PASSWORD
for (const [name, value] of Object.entries({ supabaseUrl, supabaseAnonKey, adminEmail, adminPassword, inactiveEmail, inactivePassword })) {
  if (!value) throw new Error(`Missing Phase 8 test configuration: ${name}`)
}

const assert = (condition, message) => { if (!condition) throw new Error(message) }
const runId = `phase8-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const jar = () => new Map()
const cookieHeader = cookies => [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
const updateJar = (cookies, response) => {
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
  if (cookies) updateJar(cookies, response)
  return response
}
const json = (path, method = 'GET', body, cookies, extraHeaders = {}) => appFetch(path, {
  method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...extraHeaders },
  body: body === undefined ? undefined : JSON.stringify(body)
}, cookies)
const upload = (path, filename, type, bytes, cookies, fields = {}) => {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) body.append(key, String(value))
  body.append('file', new Blob([bytes], { type }), filename)
  return appFetch(path, { method: 'POST', body }, cookies)
}
const login = (email, password, cookies) => json('/api/admin/login', 'POST', { email, password }, cookies)
const directClient = () => createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const pass = message => console.log(`PASS ${message}`)
const safeBody = async (response) => {
  const body = await response.text()
  assert(!/(storage_path|cover_storage_path|SUPABASE|postgres|stack|Bearer |sb-[a-z-]+-auth-token)/i.test(body), 'Response exposed internal or secret data.')
  return body
}
const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,8,215,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,78,68,174,66,96,130])

const adminJar = jar()
const ids = { posts: new Set(), files: new Set(), faq: new Set(), years: new Set() }
let originalSettings = null
let postId = null; let fileId = null; let yearId = null

try {
  for (const path of ['/api/admin/posts', '/api/admin/files', '/api/admin/faq', '/api/admin/years', '/api/admin/settings']) {
    assert((await appFetch(path)).status === 401, `Anonymous admin list was not denied: ${path}`)
  }
  assert((await json('/api/admin/posts', 'POST', { title: runId, slug: runId, content: runId }, undefined)).status === 401, 'Anonymous post create was not denied.')
  pass('anonymous admin API denial')

  const inactiveJar = jar()
  assert((await login(inactiveEmail, inactivePassword, inactiveJar)).status === 403, 'Inactive administrator login was not denied.')
  assert((await appFetch('/api/admin/posts', {}, inactiveJar)).status === 403, 'Inactive administrator API access was not denied.')
  const inactiveClient = directClient()
  assert(!(await inactiveClient.auth.signInWithPassword({ email: inactiveEmail, password: inactivePassword })).error, 'Inactive test identity authentication failed.')
  assert(Boolean((await inactiveClient.from('posts').insert({ title: runId, slug: `${runId}-inactive`, content: runId })).error), 'Inactive administrator direct write was allowed.')
  await inactiveClient.auth.signOut({ scope: 'local' })
  pass('inactive administrator server and RLS denial')

  assert((await login(adminEmail, adminPassword, adminJar)).status === 200, 'Active administrator login failed.')
  assert((await json('/api/admin/posts', 'POST', { title: runId, slug: runId, content: runId }, adminJar, { origin: 'https://attacker.invalid' })).status === 403, 'Cross-origin mutation was allowed.')
  pass('active administrator login and same-origin protection')

  let response = await json('/api/admin/posts', 'POST', { title: runId, slug: `${runId}-bad_slug`, content: runId }, adminJar)
  assert(response.status === 400, 'Invalid post slug was accepted.')
  response = await json('/api/admin/posts', 'POST', { title: `${runId} post`, slug: `${runId}-post`, excerpt: 'Phase 8 isolated draft.', content: 'Phase 8 isolated post body.', coverAlt: 'Phase 8 smoke cover', isFeatured: true }, adminJar)
  assert(response.status === 200, `Post draft create failed: ${response.status}`)
  postId = (await response.json()).item.id; ids.posts.add(postId)
  assert((await appFetch(`/api/public/posts/${runId}-post`)).status === 404, 'Draft post detail is public.')
  response = await appFetch('/api/public/posts'); assert(response.status === 200 && !(await response.text()).includes(`${runId}-post`), 'Draft post appears in public list.')
  assert((await json('/api/admin/posts', 'POST', { title: 'duplicate', slug: `${runId}-post`, content: runId }, adminJar)).status === 409, 'Post slug conflict was not enforced.')
  assert((await json(`/api/admin/posts/${postId}`, 'PATCH', { excerpt: 'Updated Phase 8 isolated draft.' }, adminJar)).status === 200, 'Post update failed.')
  assert((await upload(`/api/admin/posts/${postId}/cover`, `${runId}.png`, 'image/png', png, adminJar, { altText: 'Phase 8 cover' })).status === 200, 'Post cover upload failed.')
  assert((await appFetch(`/api/public/assets/posts/${postId}/cover`)).status === 404, 'Draft post cover is public.')
  assert((await json(`/api/admin/posts/${postId}/publish`, 'POST', undefined, adminJar)).status === 200, 'Post publish failed.')
  response = await appFetch('/api/public/posts'); assert(response.status === 200 && (await safeBody(response)).includes(`${runId}-post`), 'Published post missing from public list.')
  assert((await appFetch(`/api/public/posts/${runId}-post`)).status === 200, 'Published post detail unavailable.')
  assert((await appFetch(`/api/public/assets/posts/${postId}/cover`)).status === 302, 'Published cover proxy unavailable.')
  assert((await json(`/api/admin/posts/${postId}/unpublish`, 'POST', undefined, adminJar)).status === 200, 'Post unpublish failed.')
  assert((await appFetch(`/api/public/posts/${runId}-post`)).status === 404, 'Unpublished post remains public.')
  pass('post CRUD, cover, conflict, publish and privacy')

  response = await json('/api/admin/files', 'POST', { title: `${runId} file`, description: 'Phase 8 file fixture.', academicYear: 115, category: 'smoke', sortOrder: 0 }, adminJar)
  assert(response.status === 200, 'File metadata create failed.')
  fileId = (await response.json()).item.id; ids.files.add(fileId)
  assert((await upload(`/api/admin/files/${fileId}/upload`, `${runId}.html`, 'text/html', new TextEncoder().encode('<html>bad</html>'), adminJar)).status === 415, 'Invalid file MIME was accepted.')
  const oversized = new Uint8Array(20 * 1024 * 1024 + 1); oversized.fill(65)
  assert((await upload(`/api/admin/files/${fileId}/upload`, `${runId}.txt`, 'text/plain', oversized, adminJar)).status === 413, 'Oversized file was accepted.')
  const firstFile = new TextEncoder().encode(`Phase 8 first ${runId}`)
  assert((await upload(`/api/admin/files/${fileId}/upload`, `${runId}.txt`, 'text/plain', firstFile, adminJar)).status === 200, 'Valid file upload failed.')
  assert((await appFetch(`/api/public/files/${fileId}/download`)).status === 404, 'Draft file download is public.')
  assert((await json(`/api/admin/files/${fileId}/publish`, 'POST', undefined, adminJar)).status === 200, 'File publish failed.')
  response = await appFetch(`/api/public/files/${fileId}/download`)
  assert(response.status === 302 && response.headers.get('location')?.startsWith(supabaseUrl), 'Published file proxy did not issue a short-lived storage redirect.')
  const signedDownload = await fetch(response.headers.get('location'), { redirect: 'manual' })
  assert(signedDownload.status === 200, 'Signed file download failed.')
  assert(signedDownload.headers.get('content-type')?.startsWith('text/plain'), 'Download content type is incorrect.')
  assert(/attachment/i.test(signedDownload.headers.get('content-disposition') ?? ''), 'Download Content-Disposition is not attachment-safe.')
  assert((await appFetch(`/api/public/files/${fileId}/download/../../posts`)).status >= 400, 'Path traversal request was accepted.')
  const inactiveReplace = await upload(`/api/admin/files/${fileId}/replace`, `${runId}-inactive.txt`, 'text/plain', firstFile, inactiveJar)
  assert(inactiveReplace.status === 403, 'Inactive administrator replaced a file.')
  const secondFile = new TextEncoder().encode(`Phase 8 replacement ${runId}`)
  assert((await upload(`/api/admin/files/${fileId}/replace`, `${runId}-replacement.txt`, 'text/plain', secondFile, adminJar)).status === 200, 'File replacement failed.')
  assert((await json(`/api/admin/files/${fileId}/unpublish`, 'POST', undefined, adminJar)).status === 200, 'File unpublish failed.')
  assert((await appFetch(`/api/public/files/${fileId}/download`)).status === 404, 'Unpublished file remains downloadable.')
  pass('file validation, private download, replacement and privacy')

  const faqCreate = async suffix => {
    const result = await json('/api/admin/faq', 'POST', { question: `${runId} question ${suffix}?`, answer: `Phase 8 answer ${suffix}.`, isActive: true }, adminJar)
    assert(result.status === 200, `FAQ ${suffix} create failed.`)
    const item = (await result.json()).item; ids.faq.add(item.id); return item
  }
  const faqA = await faqCreate('A'); const faqB = await faqCreate('B'); const faqC = await faqCreate('C')
  response = await appFetch('/api/public/faq'); assert(response.status === 200 && (await response.text()).includes(faqA.question), 'Active FAQ is not public.')
  assert((await json(`/api/admin/faq/${faqA.id}`, 'PATCH', { isActive: false, answer: 'Phase 8 updated inactive answer.' }, adminJar)).status === 200, 'FAQ update/deactivate failed.')
  response = await appFetch('/api/public/faq'); assert(response.status === 200 && !(await response.text()).includes(faqA.question), 'Inactive FAQ remains public.')
  assert((await json('/api/admin/faq/reorder', 'POST', { ids: [faqC.id, faqB.id, faqA.id] }, adminJar)).status === 200, 'FAQ atomic reorder failed.')
  assert((await json('/api/admin/faq/reorder', 'POST', { ids: [faqA.id, faqA.id] }, adminJar)).status === 400, 'Duplicate FAQ reorder id was accepted.')
  assert((await json('/api/admin/faq/reorder', 'POST', { ids: ['00000000-0000-4000-8000-000000000000'] }, adminJar)).status >= 400, 'Missing FAQ reorder id was accepted.')
  pass('FAQ CRUD, visibility and atomic reorder')

  response = await json('/api/admin/years', 'POST', { academicYear: 116, title: `${runId} year`, theme: 'Phase 8 theme', summary: 'Phase 8 annual result summary.', highlights: ['One'], statistics: [{ label: 'People', value: '8' }], coverAlt: 'Year cover', sortOrder: 0 }, adminJar)
  assert(response.status === 200, 'Year draft create failed.')
  yearId = (await response.json()).item.id; ids.years.add(yearId)
  assert((await appFetch('/api/public/years/116')).status === 404, 'Draft year is public.')
  assert((await json('/api/admin/years', 'POST', { academicYear: 116, title: 'duplicate', summary: 'duplicate' }, adminJar)).status === 409, 'Duplicate academic year was accepted.')
  assert((await json(`/api/admin/years/${yearId}`, 'PATCH', { highlights: ['One', 'Two'], statistics: [{ label: 'People', value: '16' }] }, adminJar)).status === 200, 'Year highlights/statistics update failed.')
  assert((await upload(`/api/admin/years/${yearId}/cover`, `${runId}-year.png`, 'image/png', png, adminJar, { altText: 'Phase 8 year cover' })).status === 200, 'Year cover upload failed.')
  assert((await json(`/api/admin/years/${yearId}/publish`, 'POST', undefined, adminJar)).status === 200, 'Year publish failed.')
  response = await appFetch('/api/public/years'); assert(response.status === 200 && (await safeBody(response)).includes(`${runId} year`), 'Published year missing from public list.')
  assert((await appFetch('/api/public/years/116')).status === 200, 'Published year detail unavailable.')
  assert((await appFetch(`/api/public/assets/years/${yearId}/cover`)).status === 302, 'Published year cover unavailable.')
  assert((await json(`/api/admin/years/${yearId}/unpublish`, 'POST', undefined, adminJar)).status === 200, 'Year unpublish failed.')
  assert((await appFetch('/api/public/years/116')).status === 404, 'Unpublished year remains public.')
  pass('year CRUD, unique year, cover, publish and privacy')

  response = await appFetch('/api/public/settings'); assert(response.status === 200, 'Public settings read failed.')
  originalSettings = (await response.json()).item
  assert((await json('/api/admin/settings', 'PATCH', { slogan: `${runId} public slogan` }, undefined)).status === 401, 'Anonymous settings update was allowed.')
  assert((await json('/api/admin/settings', 'PATCH', { slogan: `${runId} inactive slogan` }, inactiveJar)).status === 403, 'Inactive administrator settings update was allowed.')
  assert((await json('/api/admin/settings', 'PATCH', { slogan: `${runId} public slogan`, locations: [{ title: 'Phase 8 location', address: 'Taipei', mapUrl: 'https://maps.google.com/' }] }, adminJar)).status === 200, 'Settings update failed.')
  response = await appFetch('/api/public/settings'); assert(response.status === 200 && (await response.text()).includes(`${runId} public slogan`), 'Public settings do not reflect update.')
  const adminClient = directClient()
  assert(!(await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword })).error, 'Direct active-admin verification login failed.')
  assert(Boolean((await adminClient.from('site_settings').insert({ singleton_key: true, site_name: runId })).error), 'Second settings singleton was inserted.')
  const restore = { ...originalSettings }; delete restore.id; delete restore.logoUrl; delete restore.updatedAt
  assert((await json('/api/admin/settings', 'PATCH', restore, adminJar)).status === 200, 'Settings restoration failed.')
  pass('settings singleton, access controls, public reflection and restore')

  for (const id of ids.faq) assert((await appFetch(`/api/admin/faq/${id}`, { method: 'DELETE' }, adminJar)).status === 200, `FAQ cleanup failed: ${id}`)
  ids.faq.clear()
  for (const [type, id] of [['posts', postId], ['files', fileId], ['years', yearId]]) {
    assert((await appFetch(`/api/admin/${type}/${id}`, { method: 'DELETE' }, adminJar)).status === 200, `${type} cleanup failed.`)
    ids[type].delete(id)
  }
  const [{ data: postRows }, { data: fileRows }, { data: yearRows }, { data: postObjects }, { data: fileObjects }, { data: yearObjects }] = await Promise.all([
    adminClient.from('posts').select('id').ilike('slug', `${runId}%`), adminClient.from('files').select('id').ilike('title', `${runId}%`),
    adminClient.from('year_summaries').select('id').ilike('title', `${runId}%`), adminClient.storage.from('content-assets').list(`posts/${postId}`),
    adminClient.storage.from('downloads').list(`files/${fileId}`), adminClient.storage.from('content-assets').list(`years/${yearId}`)
  ])
  assert(!postRows?.length && !fileRows?.length && !yearRows?.length, 'Phase 8 fixture rows remain after cleanup.')
  assert(!postObjects?.length && !fileObjects?.length && !yearObjects?.length, 'Phase 8 Storage objects remain after cleanup.')
  await adminClient.auth.signOut({ scope: 'local' })
  assert((await appFetch('/supabase-test')).status === 404, 'Production /supabase-test route is exposed.')
  assert((await appFetch('/api/admin/logout', { method: 'POST' }, adminJar)).status === 200, 'Logout failed.')
  assert((await appFetch('/api/admin/posts', {}, adminJar)).status === 401, 'Admin session leaked after logout.')
  pass('fixture cleanup, Storage cleanup, route regression and logout')
  console.log('PASS Phase 8 smoke complete; all isolated fixtures removed and settings restored.')
} finally {
  if (adminJar.size) {
    if (originalSettings) {
      const restore = { ...originalSettings }; delete restore.id; delete restore.logoUrl; delete restore.updatedAt
      try { await json('/api/admin/settings', 'PATCH', restore, adminJar) } catch { console.error('FAIL settings cleanup could not be completed.') }
    }
    for (const [type, values] of Object.entries(ids)) for (const id of values) {
      try { await appFetch(`/api/admin/${type}/${id}`, { method: 'DELETE' }, adminJar) } catch { console.error(`FAIL ${type} fixture cleanup could not be completed.`) }
    }
  }
}
