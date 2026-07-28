import { getRequestURL, setResponseHeader, type H3Event } from 'h3'

type AuthClass = 'anon' | 'non-admin' | 'admin'

const safeRequestId = (value: string | undefined) => value && /^[a-z0-9._:-]{8,100}$/i.test(value) ? value : crypto.randomUUID()

export const safePathHash = async (path: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(path))))
  .map((value) => value.toString(16).padStart(2, '0')).join('')

export const phase10RouteTemplate = (path: string) => {
  if (path === '/api/health' || path === '/api/health/ready' || path === '/robots.txt' || path === '/sitemap.xml') return path
  const normalized = path
    .replace(/\bP9-[0-9]{4}\b/g, ':reviewKey')
    .replace(/\bR9-[0-9a-f]{24}\b/gi, ':redirectKey')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
  if (/^\/activities\/[^/]+$/.test(normalized)) return '/activities/:slug'
  if (/^\/news\/[^/]+$/.test(normalized)) return '/news/:slug'
  if (/^\/years\/[^/]+$/.test(normalized)) return '/years/:year'
  if (/^\/api\/public\/activity-assets\/[^/]+$/.test(normalized)) return '/api/public/activity-assets/:assetId'
  if (/^\/api\/public\/files\/[^/]+\/download$/.test(normalized)) return '/api/public/files/:id/download'
  if (/^\/api\/admin\//.test(normalized) || /^\/admin(?:\/|$)/.test(normalized) || /^\/api\/auth\//.test(normalized)) return normalized
  const publicStatic = new Set(['/', '/about', '/activities', '/files', '/years', '/news', '/faq', '/organization', '/contact', '/programs'])
  return publicStatic.has(normalized) || normalized.startsWith('/programs/') ? normalized : '/:unmatched'
}

export const initializeOperationalContext = (event: H3Event) => {
  const incoming = event.node.req.headers['x-request-id']
  const requestId = safeRequestId(Array.isArray(incoming) ? incoming[0] : incoming)
  event.context.phase10RequestId = requestId
  event.context.phase10AuthClass = 'anon' satisfies AuthClass
  setResponseHeader(event, 'X-Request-ID', requestId)
  return requestId
}

export const setOperationalAuthClass = (event: H3Event, value: AuthClass) => {
  event.context.phase10AuthClass = value
}

export const writeOperationalLog = (event: H3Event, fields: {
  action?: string
  result?: string
  errorCode?: string
  targetId?: string
  redirectSourceHash?: string
  status?: number
  durationMs?: number
}) => {
  const config = useRuntimeConfig(event)
  const url = getRequestURL(event)
  const record = {
    timestamp: new Date().toISOString(),
    environment: String(config.phase10Environment || 'unknown'),
    requestId: String(event.context.phase10RequestId || 'unknown'),
    routeTemplate: fields.redirectSourceHash ? '/:legacy-redirect' : phase10RouteTemplate(url.pathname),
    method: event.method,
    authClass: (event.context.phase10AuthClass || 'anon') as AuthClass,
    status: fields.status ?? event.node.res.statusCode,
    ...(fields.durationMs === undefined ? {} : { durationMs: Math.max(0, Math.round(fields.durationMs)) }),
    ...(fields.action ? { action: fields.action } : {}),
    ...(fields.result ? { result: fields.result } : {}),
    ...(fields.errorCode ? { errorCode: fields.errorCode } : {}),
    ...(fields.targetId && /^[0-9a-f-]{36}$/i.test(fields.targetId) ? { targetId: fields.targetId } : {}),
    ...(fields.redirectSourceHash ? { redirectSourceHash: fields.redirectSourceHash } : {})
  }
  console.info(JSON.stringify(record))
}
