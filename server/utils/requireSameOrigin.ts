import { getHeader, getRequestURL, type H3Event } from 'h3'

export const requireSameOrigin = (event: H3Event) => {
  const origin = getHeader(event, 'origin')
  if (!origin) return

  let normalizedOrigin: string
  try {
    normalizedOrigin = new URL(origin).origin
  } catch {
    throw apiError(403, 'ADMIN_REQUIRED', 'Cross-origin request rejected.')
  }

  if (normalizedOrigin !== getRequestURL(event).origin) {
    throw apiError(403, 'ADMIN_REQUIRED', 'Cross-origin request rejected.')
  }
}
