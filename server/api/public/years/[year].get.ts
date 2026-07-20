import { defineEventHandler, getRouterParam } from 'h3'
import { mockYearSummaries } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  const value = getRouterParam(event, 'year') ?? ''
  if (!/^\d{2,3}$/.test(value) || Number(value) < 90 || Number(value) > 200) throw apiError(404, 'NOT_FOUND', 'Year summary not found.')
  const academicYear = Number(value)
  if (getContentDataMode(event) === 'mock') {
    const item = mockYearSummaries.find((summary) => summary.year === academicYear)
    if (!item) throw apiError(404, 'NOT_FOUND', 'Year summary not found.')
    return { item: { id: `mock-${item.year}`, academicYear: item.year, title: `${item.year} 學年度成果`, theme: item.theme, summary: item.summary, highlights: item.highlights, statistics: [], coverUrl: item.coverImageUrl || null, coverAlt: `${item.year} 學年度成果`, reportFile: null, publishedAt: new Date(0).toISOString() } }
  }
  const supabase = createSupabaseAnonServerClient(event)
  const { data, error } = await supabase.from('year_summaries').select(yearSelect).eq('academic_year', academicYear).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'Year summary not found.')
  return { item: mapPublicYear(data as unknown as YearRow) }
})
