import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  let failureResult = 'unexpected-failed'
  setResponseHeader(event, 'Cache-Control', 'no-store, max-age=0')
  try {
    const config = useRuntimeConfig(event)
    let contentMode: 'mock' | 'supabase'
    try {
      contentMode = getContentDataMode(event)
    } catch {
      failureResult = 'configuration-failed'
      throw new Error('configuration')
    }
    if (contentMode === 'supabase') {
      try {
        const siteUrl = new URL(String(config.public.siteUrl || ''))
        if (!['http:', 'https:'].includes(siteUrl.protocol) || siteUrl.pathname !== '/'
          || siteUrl.search || siteUrl.hash || siteUrl.username || siteUrl.password
          || (String(config.phase10Environment) === 'production' && siteUrl.protocol !== 'https:')) {
          throw new Error('site-url')
        }
      } catch {
        failureResult = 'site-url-failed'
        throw new Error('site-url')
      }
    }
    if (contentMode === 'mock') return { status: 'ready', dependency: 'mock' }
    const supabase = (() => {
      try {
        return createSupabaseAnonServerClient(event)
      } catch {
        failureResult = 'dependency-client-failed'
        throw new Error('dependency-client')
      }
    })()
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 3000)
    let response
    try {
      response = await supabase.from('site_settings')
        .select('id', { head: true, count: 'exact' })
        .limit(1)
        .abortSignal(controller.signal)
    } catch {
      failureResult = timedOut ? 'dependency-timeout' : 'dependency-query-failed'
      throw new Error('dependency')
    } finally {
      clearTimeout(timer)
    }
    if (timedOut) {
      failureResult = 'dependency-timeout'
      throw new Error('timeout')
    }
    if (response.error) {
      failureResult = 'dependency-query-failed'
      throw new Error('dependency')
    }
    return { status: 'ready', dependency: 'content' }
  } catch {
    setResponseStatus(event, 503)
    writeOperationalLog(event, {
      action: 'readiness',
      result: failureResult,
      errorCode: 'READINESS_DEPENDENCY_UNAVAILABLE',
      status: 503,
      durationMs: Date.now() - startedAt
    })
    return { status: 'unavailable', code: 'READINESS_DEPENDENCY_UNAVAILABLE' }
  }
})
