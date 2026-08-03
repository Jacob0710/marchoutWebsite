import { assert, assertIsolatedStaging, productionBaseUrl, stagingBaseUrl, stagingSupabaseUrl } from './lib/runtime.mjs'

const { stagingOrigin, productionOrigin } = assertIsolatedStaging()
let current = new URL(stagingBaseUrl)
const redirects = []

for (let hop = 0; hop < 5; hop += 1) {
  const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
  if (![301, 302, 303, 307, 308].includes(response.status)) break
  const location = response.headers.get('location')
  assert(location, `Redirect ${hop + 1} has no Location header.`)
  const next = new URL(location, current)
  redirects.push({ status: response.status, host: next.host })
  assert(next.origin !== productionOrigin, 'Staging redirects to production.')
  current = next
}

assert(current.origin === stagingOrigin, 'Staging canonical navigation left the staging origin.')
const health = await fetch(`${stagingOrigin}/api/health`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
assert(health.status === 200, `Staging health returned ${health.status}.`)
const healthBody = await health.json()
assert(healthBody.status === 'ok' && healthBody.environment === 'staging', 'Staging health lacks the staging environment marker.')
const expectedReleaseSha = process.env.PHASE12_RELEASE_SHA || ''
assert(expectedReleaseSha && healthBody.releaseSha === expectedReleaseSha, 'Staging release SHA marker does not match the requested commit.')
assert(health.headers.get('x-app-environment') === 'staging', 'Staging health lacks X-App-Environment: staging.')
assert(health.headers.get('cache-control')?.includes('no-store'), 'Staging health is cacheable.')

const ready = await fetch(`${stagingOrigin}/api/health/ready`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
assert(ready.status === 200, `Staging readiness returned ${ready.status}.`)
const readyBody = await ready.json()
assert(readyBody.status === 'ready', 'Staging readiness is not ready.')

console.log(JSON.stringify({
  status: 'passed',
  stagingHost: new URL(stagingBaseUrl).host,
  productionHost: new URL(productionBaseUrl).host,
  redirects,
  environment: healthBody.environment,
  releaseSha: healthBody.releaseSha,
  dependency: readyBody.dependency,
  stagingSupabaseHost: new URL(stagingSupabaseUrl).host,
  originMismatch: 0
}, null, 2))
