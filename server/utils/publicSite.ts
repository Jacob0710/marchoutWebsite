import { getRequestURL, type H3Event } from 'h3'

export const getPublicOrigin = (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const configured = String(config.public.siteUrl || '').trim()
  try {
    if (configured) {
      const url = new URL(configured)
      if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) throw new Error()
      if (String(config.phase10Environment) === 'production' && (url.protocol !== 'https:' || url.hostname.endsWith('.invalid'))) throw new Error()
      return url.origin
    }
  } catch {
    throw apiError(503, 'INTERNAL_ERROR', 'Public site origin is not configured.')
  }
  if (String(config.phase10Environment) === 'production') throw apiError(503, 'INTERNAL_ERROR', 'Public site origin is not configured.')
  return getRequestURL(event).origin
}

export const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')
