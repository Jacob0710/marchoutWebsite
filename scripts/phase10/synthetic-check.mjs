import { readJson } from './lib/core.mjs'

const rawOrigin = process.env.PHASE10_SYNTHETIC_ORIGIN || process.env.PHASE10_BASE_URL
if (!rawOrigin) throw new Error('PHASE10_SYNTHETIC_ORIGIN or PHASE10_BASE_URL is required')

const origin = new URL(rawOrigin)
if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash
  || origin.username || origin.password) throw new Error('Synthetic origin must be an origin-only HTTP(S) URL without credentials')

const timeoutMs = Number(process.env.PHASE10_SYNTHETIC_TIMEOUT_MS || 10_000)
const maxLatencyMs = Number(process.env.PHASE10_SYNTHETIC_MAX_LATENCY_MS || 5_000)
if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000
  || !Number.isInteger(maxLatencyMs) || maxLatencyMs < 100 || maxLatencyMs > timeoutMs) {
  throw new Error('Synthetic timeout/latency thresholds are invalid')
}

const checks = []
const safeIdentifier = value => value && /^[a-z0-9._:-]{1,200}$/i.test(value) ? value : undefined
const fail = (message) => {
  console.error(JSON.stringify({
    status: 'failed',
    origin: origin.origin,
    checkedAt: new Date().toISOString(),
    thresholds: { timeoutMs, maxLatencyMs },
    checks,
    error: message
  }, null, 2))
  throw new Error(message)
}

const request = async (path) => {
  const started = performance.now()
  let response
  try {
    response = await fetch(`${origin.origin}${path}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'marchout-phase10-synthetic/1.0' }
    })
  } catch (error) {
    const durationMs = Math.round(performance.now() - started)
    checks.push({
      path,
      status: null,
      durationMs,
      errorType: safeIdentifier(error?.name) || 'RequestError'
    })
    fail(`Request failed for ${path} after ${durationMs}ms`)
  }
  const durationMs = Math.round(performance.now() - started)
  checks.push({
    path,
    status: response.status,
    durationMs,
    ...(safeIdentifier(response.headers.get('x-request-id')) ? { requestId: response.headers.get('x-request-id') } : {}),
    ...(safeIdentifier(response.headers.get('x-vercel-id')) ? { vercelId: response.headers.get('x-vercel-id') } : {})
  })
  if (durationMs > maxLatencyMs) fail(`Latency threshold exceeded for ${path}: ${durationMs}ms`)
  return response
}

const expectStatus = async (path, expected = 200) => {
  const response = await request(path)
  if (response.status !== expected) {
    try {
      const body = await response.clone().json()
      const check = checks.at(-1)
      if (check && safeIdentifier(body?.status)) check.responseStatus = body.status
      if (check && safeIdentifier(body?.code)) check.responseCode = body.code
    } catch {
      // Failure evidence intentionally records only allowlisted JSON fields.
    }
    fail(`${path} returned ${response.status}; expected ${expected}`)
  }
  return response
}

const liveness = await expectStatus('/api/health')
const livenessBody = await liveness.json()
if (livenessBody?.status !== 'ok' || !liveness.headers.get('cache-control')?.includes('no-store')) {
  fail('Liveness body/cache contract failed')
}

const readiness = await expectStatus('/api/health/ready')
if ((await readiness.json())?.status !== 'ready') fail('Readiness body contract failed')

const rootResponse = await expectStatus('/')
const requiredHeaders = {
  'content-security-policy-report-only': /default-src 'self'/,
  'x-content-type-options': /^nosniff$/,
  'referrer-policy': /^strict-origin-when-cross-origin$/,
  'permissions-policy': /geolocation=\(\)/,
  'x-frame-options': /^DENY$/
}
for (const [name, pattern] of Object.entries(requiredHeaders)) {
  if (!pattern.test(rootResponse.headers.get(name) || '')) fail(`Security header contract failed: ${name}`)
}
if (rootResponse.headers.has('x-powered-by')) fail('Technology disclosure header is present')
if (!rootResponse.headers.get('cache-control')?.includes('public')) fail('Public root cache contract failed')
const rootHtml = await rootResponse.text()
const canonicalMatch = rootHtml.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
let canonicalHref = ''
try {
  canonicalHref = canonicalMatch ? new URL(canonicalMatch[1], origin.origin).href : ''
} catch {
  canonicalHref = ''
}
if (canonicalHref !== `${origin.origin}/`) {
  fail('Public root canonical contract failed')
}

for (const path of ['/about', '/activities', '/files', '/years']) await expectStatus(path)

const robots = await expectStatus('/robots.txt')
const robotsBody = await robots.text()
if (!/Disallow:\s*\/admin\//i.test(robotsBody) || !/Disallow:\s*\/api\//i.test(robotsBody)) {
  fail('robots.txt does not exclude admin/API routes')
}

const sitemap = await expectStatus('/sitemap.xml')
const sitemapBody = await sitemap.text()
if (!sitemapBody.includes('<urlset') || /<loc>[^<]*(?:\/admin(?:\/|<)|\/api(?:\/|<))/i.test(sitemapBody)) {
  fail('Sitemap contract failed')
}

const redirectConfig = await readJson('migration/phase10/redirect-config.json')
const activeRedirects = redirectConfig.entries.filter((item) => item.active)
if (activeRedirects.length && !process.env.PHASE10_REDIRECT_SOURCE_ORIGIN) {
  fail('Active redirects require PHASE10_REDIRECT_SOURCE_ORIGIN and the dedicated HTTP verifier')
}

console.log(JSON.stringify({
  status: 'passed',
  origin: origin.origin,
  checkedAt: new Date().toISOString(),
  thresholds: { timeoutMs, maxLatencyMs },
  checks,
  redirectConfig: {
    total: redirectConfig.entries.length,
    active: activeRedirects.length,
    dedicatedHttpVerificationRequired: activeRedirects.length > 0
  },
  mutations: 0
}, null, 2))
