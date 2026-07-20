import { FetchError } from 'ofetch'

const adminStaticRoutes = new Set([
  '/admin', '/admin/dashboard', '/admin/access',
  '/admin/activities', '/admin/activities/new', '/admin/activities/create',
  '/admin/posts', '/admin/posts/create', '/admin/files', '/admin/faq',
  '/admin/years', '/admin/settings', '/admin/categories'
])
const adminEditRoute = /^\/admin\/(?:activities\/(?:edit\/)?[0-9a-f-]+(?:\/edit)?|posts\/edit\/[0-9a-f-]+)$/i

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

  if (to.path === '/admin/login') {
    return navigateTo('/admin')
  }

  if (!adminStaticRoutes.has(to.path) && !adminEditRoute.test(to.path)) {
    return abortNavigation(createError({ statusCode: 404, statusMessage: 'Page not found.' }))
  }
})
