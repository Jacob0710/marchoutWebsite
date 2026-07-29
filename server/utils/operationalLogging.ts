import { getRequestURL, setResponseHeader, type H3Event } from 'h3'
import { phase10RouteTemplate } from '~/shared/operationalRules'

export { phase10RouteTemplate, safePathHash } from '~/shared/operationalRules'

type AuthClass = 'anon' | 'non-admin' | 'admin'

const safeRequestId = (value: string | undefined) => value && /^[a-z0-9._:-]{8,100}$/i.test(value) ? value : crypto.randomUUID()

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
