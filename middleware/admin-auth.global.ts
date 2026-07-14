export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return

  const { isLoggedIn, isSupabaseConfigured, refreshSession } = useAuth()
  const isLoginPage = to.path === '/admin/login'

  if (isSupabaseConfigured && import.meta.client && !isLoggedIn.value) {
    await refreshSession()
  }

  if (!isLoggedIn.value && !isLoginPage) {
    return navigateTo({
      path: '/admin/login',
      query: { redirect: to.fullPath }
    })
  }

  if (isLoggedIn.value && isLoginPage) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/admin/dashboard'
    return navigateTo(redirect.startsWith('/admin/login') ? '/admin/dashboard' : redirect)
  }
})
