export const safePathHash = async (path: string) => Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(path)))
).map((value) => value.toString(16).padStart(2, '0')).join('')

export const phase10RouteTemplate = (path: string) => {
  if (path === '/api/health' || path === '/api/health/ready' || path === '/robots.txt' || path === '/sitemap.xml') return path
  const normalized = path
    .replace(/\bP9-[0-9]{4}\b/g, ':reviewKey')
    .replace(/\bR9-[0-9a-f]{24}\b/gi, ':redirectKey')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
  if (/^\/activities\/[^/]+$/.test(normalized)) return '/activities/:slug'
  if (/^\/news\/[^/]+$/.test(normalized)) return '/news/:slug'
  if (/^\/years\/[^/]+$/.test(normalized)) return '/years/:year'
  if (/^\/api\/public\/activity-assets\/[^/]+$/.test(normalized)) return '/api/public/activity-assets/:assetId'
  if (/^\/api\/public\/files\/[^/]+\/download$/.test(normalized)) return '/api/public/files/:id/download'
  if (/^\/api\/admin\//.test(normalized) || /^\/admin(?:\/|$)/.test(normalized) || /^\/api\/auth\//.test(normalized)) return normalized
  const publicStatic = new Set(['/', '/about', '/activities', '/files', '/years', '/news', '/faq', '/organization', '/contact', '/programs'])
  return publicStatic.has(normalized) || normalized.startsWith('/programs/') ? normalized : '/:unmatched'
}
