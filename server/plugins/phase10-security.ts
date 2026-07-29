export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    const path = event.path.split('?', 1)[0] || ''
    const isPrivateRoute = path === '/admin' || path.startsWith('/admin/')
      || path.startsWith('/auth/') || path.startsWith('/api/admin/') || path.startsWith('/api/auth/')
      || path.startsWith('/api/public/activity-assets/')
      || /^\/api\/public\/files\/[^/]+\/download$/.test(path)
      || /^\/api\/public\/assets\/(?:posts|years)\/[^/]+\/cover$/.test(path)
    const isAssetProxy = path.startsWith('/api/public/activity-assets/')
      || /^\/api\/public\/files\/[^/]+\/download$/.test(path)
      || /^\/api\/public\/assets\/(?:posts|years)\/[^/]+\/cover$/.test(path)
    event.node.res.removeHeader('X-Powered-By')
    if (isPrivateRoute) event.node.res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    if (isAssetProxy) event.node.res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  })

  nitroApp.hooks.hook('render:response', (response, context) => {
    if (!response.headers) return
    const path = context.event?.path?.split('?', 1)[0] || ''
    const isPrivateRoute = path === '/admin' || path.startsWith('/admin/')
      || path.startsWith('/auth/') || path.startsWith('/api/admin/') || path.startsWith('/api/auth/')
      || path.startsWith('/api/public/activity-assets/')
      || /^\/api\/public\/files\/[^/]+\/download$/.test(path)
      || /^\/api\/public\/assets\/(?:posts|years)\/[^/]+\/cover$/.test(path)
    const isAssetProxy = path.startsWith('/api/public/activity-assets/')
      || /^\/api\/public\/files\/[^/]+\/download$/.test(path)
      || /^\/api\/public\/assets\/(?:posts|years)\/[^/]+\/cover$/.test(path)
    if (response.headers instanceof Headers) {
      response.headers.delete('x-powered-by')
      if (isPrivateRoute) response.headers.set('cache-control', 'private, no-store, max-age=0')
      if (isAssetProxy) response.headers.set('cross-origin-resource-policy', 'same-origin')
      return
    }
    for (const key of Object.keys(response.headers)) {
      if (key.toLowerCase() === 'x-powered-by') Reflect.deleteProperty(response.headers, key)
      if (isPrivateRoute && key.toLowerCase() === 'cache-control') Reflect.deleteProperty(response.headers, key)
      if (isAssetProxy && key.toLowerCase() === 'cross-origin-resource-policy') Reflect.deleteProperty(response.headers, key)
    }
    if (isPrivateRoute) response.headers['cache-control'] = 'private, no-store, max-age=0'
    if (isAssetProxy) response.headers['cross-origin-resource-policy'] = 'same-origin'
  })
})
