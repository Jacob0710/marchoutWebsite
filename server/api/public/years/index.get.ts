import { defineEventHandler } from 'h3'
import { mockYearSummaries } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  if (getContentDataMode(event) === 'mock') return { items: mockYearSummaries.map((item) => ({
    id: `mock-${item.year}`, academicYear: item.year, title: `${item.year} 學年度成果`, theme: item.theme,
    summary: item.summary, highlights: item.highlights, statistics: [], coverUrl: item.coverImageUrl || null,
    coverAlt: `${item.year} 學年度成果`, reportFile: null, publishedAt: new Date(0).toISOString()
  })) }
  const supabase = createSupabaseAnonServerClient(event)
  let files = await supabase.rpc('phase10_public_files')
  if (isPhase10RpcUnavailable(files.error)) files = await supabase.from('files').select(fileSelect).order('sort_order').order('published_at', { ascending: false }).order('id')
  const years = await supabase.from('year_summaries').select(publicYearSelect).order('academic_year', { ascending: false }).order('id')
  throwContentDatabaseError(years.error || files.error)
  const fileById = new Map(((files.data ?? []) as unknown as FileRow[]).map((file) => [file.id, file]))
  const rows = ((years.data ?? []) as unknown as YearRow[]).map((year) => ({ ...year, report_file: year.report_file_id ? fileById.get(year.report_file_id) ?? null : null }))
  return { items: rows.map(mapPublicYear) }
})
