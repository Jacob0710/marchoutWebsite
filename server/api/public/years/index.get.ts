import { defineEventHandler } from 'h3'
import { mockYearSummaries } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  if (getContentDataMode(event) === 'mock') return { items: mockYearSummaries.map((item) => ({
    id: `mock-${item.year}`, academicYear: item.year, title: `${item.year} 學年度成果`, theme: item.theme,
    summary: item.summary, highlights: item.highlights, statistics: [], coverUrl: item.coverImageUrl || null,
    coverAlt: `${item.year} 學年度成果`, reportFile: null, publishedAt: new Date(0).toISOString()
  })) }
  const supabase = createSupabaseAnonServerClient(event)
  const { data, error } = await supabase.from('year_summaries').select(yearSelect).order('academic_year', { ascending: false }).order('id')
  throwContentDatabaseError(error)
  return { items: ((data ?? []) as unknown as YearRow[]).map(mapPublicYear) }
})
