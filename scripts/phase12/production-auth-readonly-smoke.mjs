const origin = new URL(process.env.PHASE12_PRODUCTION_BASE_URL || '').origin
const email = process.env.PHASE12_PRODUCTION_READONLY_EMAIL || ''
const password = process.env.PHASE12_PRODUCTION_READONLY_PASSWORD || ''
if (!email || !password) throw new Error('Dedicated production read-only smoke credentials are required.')
if (process.env.PHASE12_ADMIN_EMAIL && email.toLowerCase() === process.env.PHASE12_ADMIN_EMAIL.toLowerCase()) {
  throw new Error('Production and staging identities must differ.')
}

const cookies = new Map()
const request = async (route, options = {}) => {
  const headers = new Headers(options.headers)
  if (cookies.size) headers.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '))
  if (options.method && !['GET', 'HEAD'].includes(options.method)) headers.set('origin', origin)
  const response = await fetch(`${origin}${route}`, {
    ...options,
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000)
  })
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(';')
    const separator = pair.indexOf('=')
    if (separator > 0) {
      const name = pair.slice(0, separator)
      const content = pair.slice(separator + 1)
      if (content) cookies.set(name, content)
      else cookies.delete(name)
    }
  }
  return response
}

const login = await request('/api/admin/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password })
})
if (login.status !== 200) throw new Error(`Production read-only login returned ${login.status}.`)

const reads = []
for (const route of ['/api/admin/session', '/api/admin/activities?limit=1', '/admin/dashboard', '/admin/activities']) {
  const response = await request(route)
  if (response.status !== 200) throw new Error(`${route} returned ${response.status}.`)
  if (!response.headers.get('cache-control')?.includes('no-store')) throw new Error(`${route} is missing no-store.`)
  reads.push({ route, status: response.status })
}
const logout = await request('/api/admin/logout', { method: 'POST' })
if (logout.status !== 200) throw new Error(`Production logout returned ${logout.status}.`)
if ((await request('/api/admin/session')).status !== 401) throw new Error('Production smoke session remained active after logout.')

console.log(JSON.stringify({
  status: 'passed',
  origin,
  authenticated: true,
  reads,
  contentMutations: 0,
  productionMutations: 0
}, null, 2))
