import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Year summary')
  const current = await requireExistingRow(supabase.from('year_summaries').select('id,title,summary,report_file_id').eq('id', id).maybeSingle())
  if (!current.title.trim() || !current.summary.trim()) throw apiError(400, 'VALIDATION_ERROR', 'Year summary is not ready to publish.')
  if (current.report_file_id) {
    const { data: report, error: reportError } = await supabase.from('files').select('id,status').eq('id', current.report_file_id).maybeSingle()
    throwContentDatabaseError(reportError)
    if (!report || report.status !== 'published') throw apiError(400, 'VALIDATION_ERROR', 'The linked report file must be published first.')
  }
  const { data, error } = await supabase.from('year_summaries').update({ status: 'published', published_at: new Date().toISOString(), updated_by: user.id }).eq('id', id).select(yearSelect).single()
  throwContentDatabaseError(error)
  return { item: mapAdminYear(data as unknown as YearRow) }
})
