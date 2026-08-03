const rawOrigin = process.env.PHASE12_PRODUCTION_BASE_URL || 'https://marchout-website.vercel.app'
const origin = new URL(rawOrigin).origin
const timeoutMs = Number(process.env.PHASE12_PRODUCTION_TIMEOUT_MS || 12_000)
const endpoints = ['/api/health', '/api/health/ready', '/', '/about', '/activities', '/files', '/years', '/robots.txt', '/sitemap.xml']
const results = []
const expectedReleaseSha = process.env.PHASE12_RELEASE_SHA || ''

for (const route of endpoints) {
  const started = Date.now()
  const response = await fetch(`${origin}${route}`, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) })
  const durationMs = Date.now() - started
  if (response.status !== 200) throw new Error(`${route} returned ${response.status}`)
  if (response.headers.get('set-cookie')) throw new Error(`${route} unexpectedly sets a cookie`)
  const body = await response.text()
  if (/service[_-]?role|-----BEGIN .*PRIVATE KEY-----|postgres(?:ql)?:\/\/[^/\s]+:[^@\s]+@/i.test(body)) {
    throw new Error(`${route} exposed a sensitive signature`)
  }
  if (route === '/api/health') {
    const json = JSON.parse(body)
    if (json.environment !== 'production' || response.headers.get('x-app-environment') !== 'production') {
      throw new Error('Production environment marker mismatch')
    }
    if (!expectedReleaseSha || json.releaseSha !== expectedReleaseSha) throw new Error('Production release SHA marker mismatch')
  }
  results.push({ route, status: response.status, durationMs })
}

console.log(JSON.stringify({
  status: 'passed',
  origin,
  endpoints: results,
  authenticated: false,
  releaseSha: expectedReleaseSha,
  mutations: 0
}, null, 2))
