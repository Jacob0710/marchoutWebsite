import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.PHASE5_APP_URL ?? 'http://127.0.0.1:3000'
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const nonAdminEmail = process.env.PHASE5_NON_ADMIN_EMAIL
const nonAdminPassword = process.env.PHASE5_NON_ADMIN_PASSWORD
const adminEmail = process.env.PHASE5_ADMIN_EMAIL
const adminPassword = process.env.PHASE5_ADMIN_PASSWORD

const requiredValues = {
  NUXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NUXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  PHASE5_NON_ADMIN_EMAIL: nonAdminEmail,
  PHASE5_NON_ADMIN_PASSWORD: nonAdminPassword,
  PHASE5_ADMIN_EMAIL: adminEmail,
  PHASE5_ADMIN_PASSWORD: adminPassword
}

for (const [name, value] of Object.entries(requiredValues)) {
  if (!value) throw new Error(`Missing required test environment variable: ${name}`)
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const createCookieJar = () => new Map()

const updateCookieJar = (jar, response) => {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';', 1)[0]
    const separator = pair.indexOf('=')
    if (separator < 1) continue
    const name = pair.slice(0, separator)
    const value = pair.slice(separator + 1)
    if (value) jar.set(name, value)
    else jar.delete(name)
  }
}

const cookieHeader = (jar) => [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')

const appFetch = async (path, options = {}, jar) => {
  const headers = new Headers(options.headers)
  if (jar?.size) headers.set('cookie', cookieHeader(jar))

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    redirect: 'manual'
  })
  if (jar) updateCookieJar(jar, response)
  return response
}

const login = async (email, password, jar) => appFetch('/api/admin/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password })
}, jar)

const createDirectClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

const publishedSlug = 'welcome-gathering-114'
const draftSlug = 'draft-rls-verification'

const anonAdmin = await appFetch('/admin')
const anonActivities = await appFetch('/admin/activities')
assert(anonAdmin.status === 302, 'Anonymous /admin request was not redirected.')
assert(anonActivities.status === 302, 'Anonymous /admin/activities request was not redirected.')
assert(anonAdmin.headers.get('location')?.startsWith('/admin/login'), 'Anonymous redirect target is invalid.')

const anonClient = createDirectClient()
const { data: anonDraft, error: anonDraftError } = await anonClient
  .from('activities')
  .select('slug,status')
  .eq('slug', draftSlug)
assert(!anonDraftError && anonDraft?.length === 0, 'Anonymous user can read the draft activity.')
const { error: anonAdminUsersError } = await anonClient.from('admin_users').select('user_id').limit(1)
assert(Boolean(anonAdminUsersError), 'Anonymous user can read admin_users.')
console.log('PASS anon route protection and RLS')

const nonAdminJar = createCookieJar()
const nonAdminLogin = await login(nonAdminEmail, nonAdminPassword, nonAdminJar)
assert(nonAdminLogin.status === 403, 'Non-admin login did not return an authorization denial.')
assert(nonAdminJar.size > 0, 'Non-admin authentication session cookie was not issued.')
const nonAdminAdmin = await appFetch('/admin', {}, nonAdminJar)
const nonAdminActivities = await appFetch('/admin/activities', {}, nonAdminJar)
assert(nonAdminAdmin.status === 403, 'Non-admin can access /admin.')
assert(nonAdminActivities.status === 403, 'Non-admin can access /admin/activities.')

const nonAdminClient = createDirectClient()
const { error: nonAdminAuthError } = await nonAdminClient.auth.signInWithPassword({
  email: nonAdminEmail,
  password: nonAdminPassword
})
assert(!nonAdminAuthError, 'Non-admin Supabase authentication failed.')
const { data: nonAdminPublished, error: nonAdminPublishedError } = await nonAdminClient
  .from('activities')
  .select('slug,status')
  .eq('slug', publishedSlug)
const { data: nonAdminDraft, error: nonAdminDraftError } = await nonAdminClient
  .from('activities')
  .select('slug,status')
  .eq('slug', draftSlug)
assert(!nonAdminPublishedError && nonAdminPublished?.length === 1, 'Non-admin cannot read published activity data.')
assert(!nonAdminDraftError && nonAdminDraft?.length === 0, 'Non-admin can read draft activity data.')
await nonAdminClient.auth.signOut()
console.log('PASS non-admin authentication, server authorization, and RLS')

const adminJar = createCookieJar()
const adminLogin = await login(adminEmail, adminPassword, adminJar)
assert(adminLogin.status === 200, 'Administrator login failed.')
assert(adminJar.size > 0, 'Administrator session cookie was not issued.')
assert(
  adminLogin.headers.getSetCookie().some((cookie) => /httponly/i.test(cookie) && /samesite=lax/i.test(cookie)),
  'Administrator session cookie is missing required security attributes.'
)

const adminHome = await appFetch('/admin', {}, adminJar)
const adminHomeReload = await appFetch('/admin', {}, adminJar)
const adminLoginPage = await appFetch('/admin/login', {}, adminJar)
assert(adminHome.status === 200 && adminHomeReload.status === 200, 'Administrator SSR session did not survive reload.')
assert(adminHome.headers.get('cache-control')?.includes('no-store'), 'Administrator page can be cached.')
assert(adminLoginPage.status === 302 && adminLoginPage.headers.get('location') === '/admin', 'Logged-in admin can reopen login page.')

const adminActivitiesApi = await appFetch('/api/admin/activities', {}, adminJar)
assert(adminActivitiesApi.status === 200, 'Administrator activity API request failed.')
const adminActivitiesBody = await adminActivitiesApi.json()
assert(Array.isArray(adminActivitiesBody.activities), 'Administrator activity API returned an invalid payload.')
assert(adminActivitiesBody.activities.some((activity) => activity.slug === publishedSlug), 'Published activity is missing from admin list.')
assert(adminActivitiesBody.activities.some((activity) => activity.slug === draftSlug && activity.status === 'draft'), 'Draft activity is missing from admin list.')

const adminClient = createDirectClient()
const { error: adminAuthError } = await adminClient.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword
})
assert(!adminAuthError, 'Administrator Supabase authentication failed.')
const { data: adminDraft, error: adminDraftError } = await adminClient
  .from('activities')
  .select('slug,status')
  .eq('slug', draftSlug)
assert(!adminDraftError && adminDraft?.length === 1, 'Administrator RLS cannot read the draft activity.')
await adminClient.auth.signOut()
console.log('PASS admin login, SSR session, read-only list, and draft RLS')

const adminLogout = await appFetch('/api/admin/logout', { method: 'POST' }, adminJar)
assert(adminLogout.status === 200, 'Administrator logout failed.')
const afterLogout = await appFetch('/admin', {}, adminJar)
assert(afterLogout.status === 302, 'Protected route remains accessible after logout.')
assert(afterLogout.headers.get('location')?.startsWith('/admin/login'), 'Post-logout redirect target is invalid.')
console.log('PASS logout and post-logout route protection')
