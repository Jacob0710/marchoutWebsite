import { defineEventHandler, getRequestURL, send, sendRedirect, setResponseStatus } from 'h3'

const phaseSixStaticRoutes = new Set(['/admin', '/admin/activities', '/admin/activities/new', '/admin/activities/create'])
const phaseSixEditRoute = /^\/admin\/activities\/(?:edit\/)?[0-9a-f-]+(?:\/edit)?$/i

export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event)
  const path = requestUrl.pathname

  if (path === '/admin/login') {
    try {
      await requireAdmin(event)
      return sendRedirect(event, '/admin', 302)
    } catch (error) {
      const statusCode = getHttpStatusCode(error)
      if (statusCode === 401 || statusCode === 403 || statusCode === 503) return
      throw error
    }
  }

  if (path !== '/admin' && !path.startsWith('/admin/')) return

  try {
    await requireAdmin(event)
  } catch (error) {
    const statusCode = getHttpStatusCode(error)
    if (statusCode === 401) {
      const redirect = encodeURIComponent(`${path}${requestUrl.search}`)
      return sendRedirect(event, `/admin/login?redirect=${redirect}`, 302)
    }
    const responseStatus = statusCode === 403 ? 403 : 503
    setResponseStatus(event, responseStatus)
    return send(event, responseStatus === 403 ? 'Forbidden.' : 'Service temporarily unavailable.', 'text/plain')
  }

  if (path === '/admin/dashboard') {
    return sendRedirect(event, '/admin', 302)
  }

  if (!phaseSixStaticRoutes.has(path) && !phaseSixEditRoute.test(path)) {
    setResponseStatus(event, 404)
    return send(event, 'Page not found.', 'text/plain')
  }
})
