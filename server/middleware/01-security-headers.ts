import { defineEventHandler, getRequestURL, setResponseHeader } from 'h3'

const privateNoStore = (path: string) => path === '/admin' || path.startsWith('/admin/')
  || path.startsWith('/auth/') || path.startsWith('/api/admin/') || path.startsWith('/api/auth/')
  || path.startsWith('/api/public/activity-assets/')
  || /^\/api\/public\/assets\/(?:posts|years)\/[^/]+\/cover$/.test(path)
  || (/^\/api\/public\/files\/[^/]+\/download$/.test(path))

const publicCacheable = (path: string, method: string) => method === 'GET'
  && (path === '/' || ['/about', '/activities', '/files', '/years', '/news', '/faq', '/organization', '/contact', '/programs', '/robots.txt', '/sitemap.xml'].includes(path)
    || /^\/(?:activities|years|news|programs)\/[^/]+$/.test(path)
    || path.startsWith('/api/public/'))

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const url = getRequestURL(event)
  let supabaseOrigin = ''
  try { supabaseOrigin = config.public.supabaseUrl ? new URL(config.public.supabaseUrl).origin : '' } catch { supabaseOrigin = '' }
  const connectSources = ["'self'", supabaseOrigin].filter(Boolean).join(' ')
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "media-src 'self' blob: https:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
  setResponseHeader(event, 'Content-Security-Policy-Report-Only', policy)
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setResponseHeader(event, 'Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  event.node.res.removeHeader('X-Powered-By')

  if (privateNoStore(url.pathname) || url.pathname.startsWith('/api/health')) {
    setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  } else if (publicCacheable(url.pathname, event.method)) {
    setResponseHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=30')
  } else {
    setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  }

  if (String(config.phase10Environment) === 'production'
    && String(config.phase10HstsEnabled) === 'true' && url.protocol === 'https:') {
    setResponseHeader(event, 'Strict-Transport-Security', 'max-age=31536000')
  }
})
