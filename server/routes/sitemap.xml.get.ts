import { defineEventHandler, setResponseHeader } from 'h3'
import { mockActivities, mockPosts, mockYearSummaries } from '~/utils/mockData'

interface SitemapRow { path: string; updatedAt?: string | null }

export default defineEventHandler(async (event) => {
  const origin = getPublicOrigin(event)
  const staticPaths = ['/', '/about', '/organization', '/activities', '/files', '/years', '/news', '/faq', '/contact', '/programs', '/programs/breakfast', '/programs/exploration']
  let dynamic: SitemapRow[] = []
  if (getContentDataMode(event) === 'mock') {
    dynamic = [
      ...mockActivities.filter((item) => item.status === 'published').map((item) => ({ path: `/activities/${item.slug}` })),
      ...mockPosts.filter((item) => item.status === 'published').map((item) => ({ path: `/news/${item.slug}` })),
      ...mockYearSummaries.map((item) => ({ path: `/years/${item.year}` }))
    ]
  } else {
    const supabase = createSupabaseAnonServerClient(event)
    const [activities, posts, years] = await Promise.all([
      supabase.from('activities').select('slug,updated_at').eq('status', 'published').order('slug'),
      supabase.from('posts').select('slug,updated_at').eq('status', 'published').order('slug'),
      supabase.from('year_summaries').select('academic_year,updated_at').eq('status', 'published').order('academic_year')
    ])
    if (activities.error || posts.error || years.error) throw apiError(503, 'INTERNAL_ERROR', 'Sitemap data is temporarily unavailable.')
    dynamic = [
      ...(activities.data ?? []).map((item) => ({ path: `/activities/${item.slug}`, updatedAt: item.updated_at })),
      ...(posts.data ?? []).map((item) => ({ path: `/news/${item.slug}`, updatedAt: item.updated_at })),
      ...(years.data ?? []).map((item) => ({ path: `/years/${item.academic_year}`, updatedAt: item.updated_at }))
    ]
  }
  const rows: SitemapRow[] = [...staticPaths.map((path): SitemapRow => ({ path })), ...dynamic]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.path === item.path) === index)
    .sort((left, right) => left.path.localeCompare(right.path, 'en'))
  const body = rows.map((item) => {
    const lastmod = item.updatedAt && !Number.isNaN(Date.parse(item.updatedAt))
      ? `<lastmod>${escapeXml(new Date(item.updatedAt).toISOString())}</lastmod>` : ''
    return `<url><loc>${escapeXml(`${origin}${item.path}`)}</loc>${lastmod}</url>`
  }).join('')
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
})
