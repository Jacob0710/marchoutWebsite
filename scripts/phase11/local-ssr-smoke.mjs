import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

const serverEntry = '.output/server/index.mjs'
await access(serverEntry).catch(() => {
  throw new Error(`Phase 11 integration smoke requires ${serverEntry}; run pnpm build first.`)
})

const port = Number(process.env.PHASE11_TEST_PORT || (44000 + (process.pid % 1000)))
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('PHASE11_TEST_PORT must be an integer between 1024 and 65535.')
}

const origin = `http://127.0.0.1:${port}`
let logs = ''
const server = spawn(process.execPath, [serverEntry], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    NITRO_HOST: '127.0.0.1',
    NITRO_PORT: String(port),
    PORT: String(port),
    NUXT_PHASE10_ENVIRONMENT: 'local',
    NUXT_PUBLIC_SITE_URL: '',
    NUXT_PUBLIC_SUPABASE_URL: '',
    NUXT_PUBLIC_SUPABASE_ANON_KEY: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
})

const capture = (chunk) => {
  logs = `${logs}${chunk.toString('utf8')}`.slice(-12000)
}
server.stdout.on('data', capture)
server.stderr.on('data', capture)

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const request = async (path) => {
  const response = await fetch(`${origin}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(10000)
  })
  const body = await response.text()
  return { path, response, body }
}

const assertSecurityHeaders = ({ path, response }) => {
  assert(response.headers.get('x-content-type-options') === 'nosniff', `${path} is missing nosniff`)
  assert(response.headers.get('x-frame-options') === 'DENY', `${path} is missing frame denial`)
  assert(response.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', `${path} has an unexpected referrer policy`)
  assert(response.headers.get('content-security-policy-report-only')?.includes("object-src 'none'"), `${path} is missing CSP`)
  assert(!response.headers.has('x-powered-by'), `${path} discloses X-Powered-By`)
  assert(/^[a-z0-9._:-]{8,100}$/i.test(response.headers.get('x-request-id') || ''), `${path} is missing a safe request id`)
}

const waitForServer = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Nitro exited before readiness.\n${logs}`)
    try {
      const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return
    } catch {
      // The loopback listener is still starting.
    }
    await delay(250)
  }
  throw new Error(`Nitro did not become ready within 20 seconds.\n${logs}`)
}

const terminate = async () => {
  if (server.exitCode !== null) return
  server.kill()
  for (let attempt = 0; attempt < 20 && server.exitCode === null; attempt += 1) await delay(100)
  if (server.exitCode === null) server.kill('SIGKILL')
}

const checked = []
try {
  await waitForServer()

  const health = await request('/api/health')
  assert(health.response.status === 200, '/api/health must return 200')
  assert(JSON.parse(health.body).status === 'ok', '/api/health returned an invalid contract')
  assert(health.response.headers.get('cache-control')?.includes('no-store'), '/api/health must not be cached')
  assertSecurityHeaders(health)
  checked.push(health.path)

  const ready = await request('/api/health/ready')
  assert(ready.response.status === 200, '/api/health/ready must return 200 in mock mode')
  assert(JSON.parse(ready.body).dependency === 'mock', '/api/health/ready must remain local and credential-free')
  checked.push(ready.path)

  for (const path of ['/', '/about', '/activities', '/files', '/years', '/robots.txt', '/sitemap.xml']) {
    const result = await request(path)
    assert(result.response.status === 200, `${path} must return 200`)
    assert(result.response.headers.get('cache-control')?.startsWith('public,'), `${path} must use the public cache contract`)
    assertSecurityHeaders(result)
    checked.push(path)
  }

  const home = await request('/')
  assert(/<html[^>]+lang="zh-Hant"/i.test(home.body), 'home SSR HTML must declare zh-Hant')

  const login = await request('/admin/login')
  assert(login.response.status === 200, '/admin/login must return 200')
  assert(login.response.headers.get('cache-control')?.includes('no-store'), '/admin/login must not be cached')
  assert(/type="email"/i.test(login.body) && /type="password"/i.test(login.body), '/admin/login fields are missing from SSR HTML')
  assertSecurityHeaders(login)
  checked.push(login.path)

  const missing = await request('/phase11-intentional-missing-route')
  assert(missing.response.status === 404, 'unknown route must return a real 404')
  const missingCacheControl = missing.response.headers.get('cache-control')
  assert(
    /(?:^|,\s*)(?:no-store|no-cache)(?:,|$)/i.test(missingCacheControl || '')
      && !missingCacheControl?.startsWith('public,'),
    `404 response must require revalidation or no-store; received ${missingCacheControl || 'no cache-control'}`
  )
  assert(!/(?:service_role|postgres(?:ql)?:\/\/|private key)/i.test(missing.body), '404 response leaks a sensitive signature')
  checked.push(missing.path)

  console.log(JSON.stringify({
    status: 'ok',
    origin,
    endpoints: checked.length,
    checked
  }, null, 2))
} catch (error) {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  throw new Error(`${message}\nNitro output:\n${logs}`, { cause: error })
} finally {
  await terminate()
}
