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
const request = async (path) => {
  const started = performance.now()
  const response = await fetch(`${origin.origin}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'marchout-phase10-synthetic/1.0' }
  })
  const durationMs = Math.round(performance.now() - started)
  if (durationMs > maxLatencyMs) throw new Error(`Latency threshold exceeded for ${path}: ${durationMs}ms`)
  checks.push({ path, status: response.status, durationMs })
  return response
}

const expectStatus = async (path, expected = 200) => {
  const response = await request(path)
  if (response.status !== expected) throw new Error(`${path} returned ${response.status}; expected ${expected}`)
  return response
}

const liveness = await expectStatus('/api/health')
const livenessBody = await liveness.json()
if (livenessBody?.status !== 'ok' || !liveness.headers.get('cache-control')?.includes('no-store')) {
  throw new Error('Liveness body/cache contract failed')
}

const readiness = await expectStatus('/api/health/ready')
if ((await readiness.json())?.status !== 'ready') throw new Error('Readiness body contract failed')

const rootResponse = await expectStatus('/')
const requiredHeaders = {
  'content-security-policy-report-only': /default-src 'self'/,
  'x-content-type-options': /^nosniff$/,
  'referrer-policy': /^strict-origin-when-cross-origin$/,
  'permissions-policy': /geolocation=\(\)/,
  'x-frame-options': /^DENY$/
}
for (const [name, pattern] of Object.entries(requiredHeaders)) {
  if (!pattern.test(rootResponse.headers.get(name) || '')) throw new Error(`Security header contract failed: ${name}`)
}
if (rootResponse.headers.has('x-powered-by')) throw new Error('Technology disclosure header is present')
if (!rootResponse.headers.get('cache-control')?.includes('public')) throw new Error('Public root cache contract failed')
const rootHtml = await rootResponse.text()
const canonicalMatch = rootHtml.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
if (!canonicalMatch || new URL(canonicalMatch[1], origin.origin).href !== `${origin.origin}/`) {
  throw new Error('Public root canonical contract failed')
}

for (const path of ['/about', '/activities', '/files', '/years']) await expectStatus(path)

const robots = await expectStatus('/robots.txt')
const robotsBody = await robots.text()
if (!/Disallow:\s*\/admin\//i.test(robotsBody) || !/Disallow:\s*\/api\//i.test(robotsBody)) {
  throw new Error('robots.txt does not exclude admin/API routes')
}

const sitemap = await expectStatus('/sitemap.xml')
const sitemapBody = await sitemap.text()
if (!sitemapBody.includes('<urlset') || /<loc>[^<]*(?:\/admin(?:\/|<)|\/api(?:\/|<))/i.test(sitemapBody)) {
  throw new Error('Sitemap contract failed')
}

const redirectConfig = await readJson('migration/phase10/redirect-config.json')
const activeRedirects = redirectConfig.entries.filter((item) => item.active)
if (activeRedirects.length && !process.env.PHASE10_REDIRECT_SOURCE_ORIGIN) {
  throw new Error('Active redirects require PHASE10_REDIRECT_SOURCE_ORIGIN and the dedicated HTTP verifier')
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
