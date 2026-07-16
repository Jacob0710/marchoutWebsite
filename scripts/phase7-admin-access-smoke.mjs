import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.PHASE7_BASE_URL ?? process.env.PHASE6_BASE_URL ?? 'http://127.0.0.1:3000'
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const adminEmail = process.env.PHASE7_ADMIN_EMAIL ?? process.env.PHASE6_ADMIN_EMAIL
const adminPassword = process.env.PHASE7_ADMIN_PASSWORD ?? process.env.PHASE6_ADMIN_PASSWORD
const nonAdminEmail = process.env.PHASE7_NON_ADMIN_EMAIL ?? process.env.PHASE6_NON_ADMIN_EMAIL
const nonAdminPassword = process.env.PHASE7_NON_ADMIN_PASSWORD ?? process.env.PHASE6_NON_ADMIN_PASSWORD

for (const [name, value] of Object.entries({ supabaseUrl, supabaseAnonKey, adminEmail, adminPassword, nonAdminEmail, nonAdminPassword })) {
  if (!value) throw new Error(`Missing Phase 7 test configuration: ${name}`)
}

const assert = (condition, message) => { if (!condition) throw new Error(message) }
const createJar = () => new Map()
const cookieHeader = (jar) => [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
const updateJar = (jar, response) => {
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(';')
    const separator = pair.indexOf('=')
    if (separator < 1) continue
    const name = pair.slice(0, separator)
    const content = pair.slice(separator + 1)
    if (content) jar.set(name, content); else jar.delete(name)
  }
}
const appFetch = async (path, options = {}, jar) => {
  const headers = new Headers(options.headers)
  if (jar?.size) headers.set('cookie', cookieHeader(jar))
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual' })
  if (jar) updateJar(jar, response)
  return response
}
const json = (path, method, body, jar, headers = {}) => appFetch(path, {
  method,
  headers: { 'content-type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body)
}, jar)
const login = (email, password, jar) => json('/api/admin/login', 'POST', { email, password }, jar)
const createDirectClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})
const pass = (message) => console.log(`PASS ${message}`)
const runId = `phase7-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const pendingInvitationIds = new Set()
let primaryJar = createJar()
let testAdminJar = createJar()
let testUserId = null

const getAdmins = async (jar) => {
  const response = await appFetch('/api/admin/access/admins', {}, jar)
  assert(response.status === 200, `Admin list failed with ${response.status}.`)
  return (await response.json()).admins
}

const setActive = (jar, userId, isActive) => json(`/api/admin/access/admins/${userId}`, 'PATCH', { isActive }, jar)

try {
  for (const [path, method] of [
    ['/api/admin/access/admins', 'GET'],
    ['/api/admin/access/invitations', 'GET'],
    ['/api/admin/access/audit', 'GET'],
    ['/api/admin/access/invitations', 'POST']
  ]) {
    const response = method === 'GET' ? await appFetch(path) : await json(path, method, { email: `${runId}@example.invalid` })
    assert(response.status === 401, `Anonymous ${method} ${path} was not rejected.`)
  }
  pass('anonymous access governance rejection')

  assert((await login(adminEmail, adminPassword, primaryJar)).status === 200, 'Primary administrator preflight login failed.')
  let admins = await getAdmins(primaryJar)
  const activeFixture = admins.find((admin) => admin.email.toLowerCase() === nonAdminEmail.toLowerCase())
  if (activeFixture?.isActive) {
    assert((await setActive(primaryJar, activeFixture.userId, false)).status === 200, 'Active test fixture could not be restored during preflight.')
  }

  const nonAdminJar = createJar()
  assert((await login(nonAdminEmail, nonAdminPassword, nonAdminJar)).status === 403, 'Non-admin login boundary changed.')
  assert((await appFetch('/api/admin/access/admins', {}, nonAdminJar)).status === 403, 'Non-admin can list administrators.')
  assert((await appFetch('/api/admin/access/audit', {}, nonAdminJar)).status === 403, 'Non-admin can list access audit.')
  assert((await json('/api/admin/access/invitations', 'POST', { email: `${runId}@example.invalid` }, nonAdminJar)).status === 403, 'Non-admin can create invitations.')
  pass('non-admin access governance rejection')

  admins = await getAdmins(primaryJar)
  const primary = admins.find((admin) => admin.email.toLowerCase() === adminEmail.toLowerCase())
  assert(primary?.isActive, 'Primary administrator is not active.')
  pass('active administrator list access')

  const activeConflict = await json('/api/admin/access/invitations', 'POST', { email: adminEmail, expiresInDays: 7 }, primaryJar)
  assert(activeConflict.status === 409, 'Active administrator invitation conflict was not enforced.')
  const crossOrigin = await json('/api/admin/access/invitations', 'POST', { email: `${runId}-cross-origin@example.invalid`, expiresInDays: 7 }, primaryJar, { origin: 'https://attacker.invalid' })
  assert(crossOrigin.status === 403, 'Cross-origin invitation mutation was not rejected.')

  const syntheticEmail = `${runId}@example.invalid`
  const invitationResponse = await json('/api/admin/access/invitations', 'POST', { email: syntheticEmail, expiresInDays: 7 }, primaryJar)
  assert(invitationResponse.status === 200, `Invitation creation failed with ${invitationResponse.status}.`)
  assert(invitationResponse.headers.get('cache-control')?.includes('no-store'), 'Invitation response can be cached.')
  const invitationBody = await invitationResponse.json()
  pendingInvitationIds.add(invitationBody.invitation.id)
  assert(invitationBody.inviteUrl.includes('/auth/admin-invite#token='), 'Invite URL does not use a fragment token.')
  let revokedToken = new URL(invitationBody.inviteUrl).hash.replace('#token=', '')
  assert(/^[0-9a-f]{64}$/.test(revokedToken), 'Invitation token is not 256-bit hex.')
  assert(!Object.hasOwn(invitationBody.invitation, 'tokenHash') && !Object.hasOwn(invitationBody.invitation, 'rawToken'), 'Invitation response exposes token fields.')
  assert((await json('/api/admin/access/invitations', 'POST', { email: syntheticEmail, expiresInDays: 7 }, primaryJar)).status === 409, 'Duplicate pending invitation was not rejected.')
  assert((await json(`/api/admin/access/invitations/${invitationBody.invitation.id}/revoke`, 'POST', undefined, primaryJar)).status === 200, 'Invitation revoke failed.')
  pendingInvitationIds.delete(invitationBody.invitation.id)
  const revokedAcceptJar = createJar()
  assert((await json('/api/auth/admin-invite/accept', 'POST', { email: nonAdminEmail, password: nonAdminPassword, token: revokedToken }, revokedAcceptJar)).status === 409, 'Revoked token was accepted.')
  revokedToken = ''
  pass('invitation create, duplicate, one-time URL, and revoke')

  admins = await getAdmins(primaryJar)
  let testAdmin = admins.find((admin) => admin.email.toLowerCase() === nonAdminEmail.toLowerCase())

  if (testAdmin?.isActive) {
    assert((await setActive(primaryJar, testAdmin.userId, false)).status === 200, 'Active test fixture could not be restored before the repeat run.')
    testAdmin = { ...testAdmin, isActive: false }
  }

  if (!testAdmin) {
    const acceptInvitationResponse = await json('/api/admin/access/invitations', 'POST', { email: nonAdminEmail, expiresInDays: 7 }, primaryJar)
    assert(acceptInvitationResponse.status === 200, `Test account invitation failed with ${acceptInvitationResponse.status}.`)
    const acceptInvitation = await acceptInvitationResponse.json()
    pendingInvitationIds.add(acceptInvitation.invitation.id)
    let acceptanceToken = new URL(acceptInvitation.inviteUrl).hash.replace('#token=', '')

    const wrongTokenJar = createJar()
    assert((await json('/api/auth/admin-invite/accept', 'POST', { email: nonAdminEmail, password: nonAdminPassword, token: '0'.repeat(64) }, wrongTokenJar)).status === 404, 'Unknown token was accepted.')
    assert((await appFetch('/api/admin/access/admins', {}, wrongTokenJar)).status === 401, 'Failed acceptance retained a session.')

    const wrongEmailJar = createJar()
    assert((await json('/api/auth/admin-invite/accept', 'POST', { email: adminEmail, password: adminPassword, token: acceptanceToken }, wrongEmailJar)).status === 409, 'Wrong-email account accepted the invitation.')
    assert((await appFetch('/api/admin/access/admins', {}, wrongEmailJar)).status === 401, 'Email mismatch retained a session.')

    const acceptanceJar = createJar()
    assert((await json('/api/auth/admin-invite/accept', 'POST', { email: nonAdminEmail, password: nonAdminPassword, token: acceptanceToken }, acceptanceJar)).status === 200, 'Valid invitation acceptance failed.')
    pendingInvitationIds.delete(acceptInvitation.invitation.id)
    const replayJar = createJar()
    assert((await json('/api/auth/admin-invite/accept', 'POST', { email: nonAdminEmail, password: nonAdminPassword, token: acceptanceToken }, replayJar)).status === 409, 'Invitation replay was accepted.')
    assert((await appFetch('/api/admin/access/admins', {}, replayJar)).status === 401, 'Replay failure retained a session.')
    acceptanceToken = ''
    pass('invitation authentication, email binding, atomic acceptance, and replay protection')
  } else {
    assert(testAdmin.isActive === false, 'Dedicated test account must begin inactive on repeat runs.')
    assert((await json('/api/admin/access/invitations', 'POST', { email: nonAdminEmail, expiresInDays: 7 }, primaryJar)).status === 409, 'Inactive administrator invitation conflict was not enforced.')
    assert((await setActive(primaryJar, testAdmin.userId, true)).status === 200, 'Existing inactive fixture could not be reactivated.')
    pass('repeat-run inactive fixture reactivation')
  }

  admins = await getAdmins(primaryJar)
  testAdmin = admins.find((admin) => admin.email.toLowerCase() === nonAdminEmail.toLowerCase())
  assert(testAdmin?.isActive, 'Accepted test administrator is not active.')
  testUserId = testAdmin.userId
  assert((await login(nonAdminEmail, nonAdminPassword, testAdminJar)).status === 200, 'Test administrator login failed.')
  assert((await setActive(testAdminJar, testUserId, false)).status === 409, 'Self-deactivation was not rejected.')

  assert((await setActive(primaryJar, testUserId, false)).status === 200, 'Test administrator deactivation failed.')
  assert((await appFetch('/api/admin/access/admins', {}, testAdminJar)).status === 403, 'Inactive administrator can list administrators.')
  assert((await json('/api/admin/activities', 'POST', { title: runId, slug: runId }, testAdminJar)).status === 403, 'Inactive administrator can use Phase 6 CRUD.')
  assert((await setActive(primaryJar, testUserId, true)).status === 200, 'Test administrator reactivation failed.')
  assert((await appFetch('/api/admin/access/admins', {}, testAdminJar)).status === 200, 'Reactivated administrator cannot regain access.')
  pass('deactivation, Phase 6 denial, self-protection, and reactivation')

  const [deactivateTest, deactivatePrimary] = await Promise.all([
    setActive(primaryJar, testUserId, false),
    setActive(testAdminJar, primary.userId, false)
  ])
  const concurrencyStatuses = [deactivateTest.status, deactivatePrimary.status]
  assert(concurrencyStatuses.includes(200), 'Concurrent mutual deactivation produced no successful request.')
  assert(concurrencyStatuses.some((status) => status === 403 || status === 409), 'Concurrent mutual deactivation was not serialized.')

  const refreshedPrimaryJar = createJar()
  const refreshedTestJar = createJar()
  const primaryLoginStatus = (await login(adminEmail, adminPassword, refreshedPrimaryJar)).status
  const testLoginStatus = (await login(nonAdminEmail, nonAdminPassword, refreshedTestJar)).status
  assert([primaryLoginStatus, testLoginStatus].includes(200), 'Concurrent requests left no active administrator.')
  if (primaryLoginStatus !== 200) {
    assert(testLoginStatus === 200, 'No administrator can restore primary access.')
    assert((await setActive(refreshedTestJar, primary.userId, true)).status === 200, 'Primary administrator restoration failed.')
  }
  primaryJar = createJar()
  assert((await login(adminEmail, adminPassword, primaryJar)).status === 200, 'Restored primary administrator login failed.')
  assert((await setActive(primaryJar, testUserId, false)).status === 200, 'Test administrator final deactivation failed.')
  pass('concurrent mutual deactivation and last-admin preservation')

  assert((await json('/api/admin/access/invitations', 'POST', { email: nonAdminEmail, expiresInDays: 7 }, primaryJar)).status === 409, 'Inactive administrator can be re-invited.')
  const auditResponse = await appFetch('/api/admin/access/audit?limit=100', {}, primaryJar)
  assert(auditResponse.status === 200, 'Audit list failed.')
  const auditLogs = (await auditResponse.json()).auditLogs
  for (const action of ['invitation_created', 'invitation_revoked', 'invitation_accepted', 'admin_activated', 'admin_deactivated']) {
    assert(auditLogs.some((entry) => entry.action === action), `Audit action is missing: ${action}.`)
  }
  assert(!JSON.stringify(auditLogs).includes('token='), 'Audit output contains an invitation token.')

  const directAdmin = createDirectClient()
  assert(!(await directAdmin.auth.signInWithPassword({ email: adminEmail, password: adminPassword })).error, 'Direct admin login failed.')
  assert(Boolean((await directAdmin.from('admin_invitations').select('token_hash').limit(1)).error), 'Admin can directly read invitation token hashes.')
  assert(Boolean((await directAdmin.from('admin_access_audit_logs').insert({ action: 'admin_activated' })).error), 'Admin can directly insert audit logs.')
  assert(Boolean((await directAdmin.from('admin_access_audit_logs').update({ metadata: {} }).eq('id', auditLogs[0]?.id ?? 0)).error), 'Admin can directly update audit logs.')
  await directAdmin.auth.signOut({ scope: 'local' })
  pass('append-only audit and direct table denial')

  admins = await getAdmins(primaryJar)
  assert(admins.some((admin) => admin.userId === primary.userId && admin.isActive), 'Primary administrator was not restored active.')
  assert(admins.some((admin) => admin.userId === testUserId && !admin.isActive), 'Test account was not restored inactive.')
  assert((await appFetch('/supabase-test')).status === 404, 'Production /supabase-test route is exposed.')
  pass('final access state, cleanup, and Phase 5/6 route regression')
  console.log('PASS Phase 7 smoke complete; primary active, test fixture inactive, no pending test invitation.')
} finally {
  if (primaryJar.size) {
    for (const id of pendingInvitationIds) {
      try { await json(`/api/admin/access/invitations/${id}/revoke`, 'POST', undefined, primaryJar) } catch { console.error('FAIL invitation cleanup request could not be completed.') }
    }
    if (testUserId) {
      try { await setActive(primaryJar, testUserId, false) } catch { console.error('FAIL test administrator cleanup could not be completed.') }
    }
  }
}
