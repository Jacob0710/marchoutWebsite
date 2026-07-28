import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store, max-age=0')
  try {
    const config = useRuntimeConfig(event)
    if (getContentDataMode(event) === 'supabase') {
      const siteUrl = new URL(String(config.public.siteUrl || ''))
      if (!['http:', 'https:'].includes(siteUrl.protocol) || siteUrl.pathname !== '/'
        || siteUrl.search || siteUrl.hash || siteUrl.username || siteUrl.password
        || (String(config.phase10Environment) === 'production' && siteUrl.protocol !== 'https:')) {
        throw new Error('site-url')
      }
    }
    if (getContentDataMode(event) === 'mock') return { status: 'ready', dependency: 'mock' }
    const supabase = createSupabaseAnonServerClient(event)
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 3000) })
    const response = await Promise.race([
      supabase.from('site_settings').select('id', { head: true, count: 'exact' }).limit(1), timeout
    ]).finally(() => { if (timer) clearTimeout(timer) })
    if (response.error) throw new Error('dependency')
    return { status: 'ready', dependency: 'content' }
  } catch {
    setResponseStatus(event, 503)
    writeOperationalLog(event, { action: 'readiness', result: 'failed', errorCode: 'READINESS_DEPENDENCY_UNAVAILABLE', status: 503 })
    return { status: 'unavailable', code: 'READINESS_DEPENDENCY_UNAVAILABLE' }
  }
})
