import { FetchError } from 'ofetch'

const phaseFiveRoutes = new Set(['/admin', '/admin/activities'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || (to.path !== '/admin' && !to.path.startsWith('/admin/'))) return

  try {
    await $fetch('/api/admin/session')
  } catch (error) {
    const statusCode = error instanceof FetchError ? error.statusCode : 500
    if (to.path === '/admin/login' && (statusCode === 401 || statusCode === 403 || statusCode === 503)) return
    if (statusCode === 401) {
      return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
    }
    return abortNavigation(createError({
      statusCode: statusCode === 403 ? 403 : 503,
      statusMessage: statusCode === 403 ? 'Administrator access required.' : 'Authorization service unavailable.'
    }))
  }

  if (to.path === '/admin/login' || to.path === '/admin/dashboard') {
    return navigateTo('/admin')
  }

  if (!phaseFiveRoutes.has(to.path)) {
    return abortNavigation(createError({ statusCode: 404, statusMessage: 'Page not found.' }))
  }
})
