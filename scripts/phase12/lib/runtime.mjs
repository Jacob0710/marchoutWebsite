import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

export const stagingBaseUrl = process.env.PHASE12_STAGING_BASE_URL || process.env.PHASE12_BASE_URL || ''
export const productionBaseUrl = process.env.PHASE12_PRODUCTION_BASE_URL || 'https://marchout-website.vercel.app'
export const stagingSupabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.PHASE12_STAGING_SUPABASE_URL || ''
export const productionSupabaseUrl = process.env.PHASE12_PRODUCTION_SUPABASE_URL || ''
export const runId = String(process.env.PHASE12_E2E_RUN_ID || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
export const fixturePrefix = runId ? `e2e-phase12-${runId}` : ''
export const cacheDirectory = path.resolve('.phase12-cache')

const adminEmail = process.env.PHASE12_ADMIN_EMAIL || ''
const adminPassword = process.env.PHASE12_ADMIN_PASSWORD || ''

export const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

export const assertIsolatedStaging = () => {
  assert(stagingBaseUrl, 'PHASE12_STAGING_BASE_URL is required.')
  assert(productionBaseUrl, 'PHASE12_PRODUCTION_BASE_URL is required.')
  const stagingOrigin = new URL(stagingBaseUrl).origin
  const productionOrigin = new URL(productionBaseUrl).origin
  assert(stagingOrigin !== productionOrigin, 'Staging origin must differ from production.')
  assert(!stagingOrigin.includes('marchout-website.vercel.app'), 'Staging origin resolves to the production canonical host.')
  assert(stagingSupabaseUrl && productionSupabaseUrl, 'Both staging and production Supabase public URLs are required for isolation verification.')
  assert(new URL(stagingSupabaseUrl).origin !== new URL(productionSupabaseUrl).origin, 'Staging and production Supabase projects must differ.')
  return { stagingOrigin, productionOrigin }
}

export const assertStagingMutationAuthority = () => {
  const origins = assertIsolatedStaging()
  assert(process.env.PHASE12_MUTATION_TARGET === 'staging', 'Mutation target must be explicitly set to staging.')
  assert(process.env.PHASE12_STAGING_ISOLATION_CONFIRMED === 'true', 'Staging isolation confirmation is required.')
  assert(runId, 'PHASE12_E2E_RUN_ID is required for namespaced mutations.')
  assert(adminEmail && adminPassword, 'Dedicated Phase 12 staging administrator credentials are required.')
  const productionAdminEmail = process.env.PHASE12_PRODUCTION_ADMIN_EMAIL || ''
  if (productionAdminEmail) {
    assert(adminEmail.toLowerCase() !== productionAdminEmail.toLowerCase(), 'Staging and production administrator identities must differ.')
  }
  return origins
}

export const createStagingServiceClient = () => {
  assertStagingMutationAuthority()
  const serviceRoleKey = process.env.PHASE12_STAGING_SUPABASE_SERVICE_ROLE_KEY || ''
  assert(serviceRoleKey, 'The staging service role is required only for seed and cleanup verification.')
  return createClient(stagingSupabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

const cookieHeader = cookies => [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
const updateCookies = (cookies, response) => {
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

export const createStagingAppSession = async () => {
  const { stagingOrigin } = assertStagingMutationAuthority()
  const cookies = new Map()
  const request = async (route, options = {}) => {
    const headers = new Headers(options.headers)
    if (cookies.size) headers.set('cookie', cookieHeader(cookies))
    if (options.method && !['GET', 'HEAD'].includes(options.method)) headers.set('origin', stagingOrigin)
    const response = await fetch(`${stagingOrigin}${route}`, {
      ...options,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000)
    })
    updateCookies(cookies, response)
    return response
  }
  const json = (route, method = 'GET', body) => request(route, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const login = await json('/api/admin/login', 'POST', { email: adminEmail, password: adminPassword })
  assert(login.status === 200, `Dedicated staging administrator login failed with ${login.status}.`)
  return { request, json, cookies, stagingOrigin }
}

export const responseJson = async (response, expectedStatus, label) => {
  if (response.status !== expectedStatus) {
    const body = (await response.text()).slice(0, 300)
    throw new Error(`${label} returned ${response.status}, expected ${expectedStatus}: ${body}`)
  }
  return response.json()
}

export const writePrivateEvidence = async (name, value) => {
  await fs.mkdir(cacheDirectory, { recursive: true })
  await fs.writeFile(path.join(cacheDirectory, name), `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
}
