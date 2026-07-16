import { getRequestURL, type H3Event } from 'h3'

const isLoopback = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'

export const getAdminInviteOrigin = (event: H3Event) => {
  const configured = String(useRuntimeConfig(event).public.siteUrl || '').trim()
  const requestUrl = getRequestURL(event)
  const candidate = configured || (isLoopback(requestUrl.hostname) ? requestUrl.origin : '')

  let origin: URL
  try {
    origin = new URL(candidate)
  } catch {
    throw apiError(503, 'INTERNAL_ERROR', 'Invitation URL is not configured.')
  }

  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw apiError(503, 'INTERNAL_ERROR', 'Invitation URL is not configured.')
  }
  if (origin.protocol !== 'https:' && !isLoopback(origin.hostname)) {
    throw apiError(503, 'INTERNAL_ERROR', 'Invitation URL is not configured.')
  }
  return origin.origin
}

export const buildAdminInviteUrl = (event: H3Event, rawToken: string) =>
  `${getAdminInviteOrigin(event)}/auth/admin-invite#token=${encodeURIComponent(rawToken)}`

export const requireSecureAcceptanceOrigin = (event: H3Event) => {
  const url = getRequestURL(event)
  if (url.protocol !== 'https:' && !isLoopback(url.hostname)) {
    throw apiError(403, 'ADMIN_REQUIRED', 'Secure origin required.')
  }
}
