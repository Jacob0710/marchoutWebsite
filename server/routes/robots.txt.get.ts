import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler((event) => {
  const origin = getPublicOrigin(event)
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /auth/',
    'Disallow: /supabase-test',
    `Sitemap: ${origin}/sitemap.xml`,
    ''
  ].join('\n')
})
