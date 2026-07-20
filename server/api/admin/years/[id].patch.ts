import { defineEventHandler, getRouterParam, readBody } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Year summary')
  const input = validateYearInput(await readBody(event), true)
  const payload: Record<string, unknown> = { updated_by: user.id }
  if (input.academicYear !== undefined) payload.academic_year = input.academicYear
  if (input.title !== undefined) payload.title = input.title
  if (input.theme !== undefined) payload.theme = input.theme || null
  if (input.summary !== undefined) payload.summary = input.summary
  if (input.highlights !== undefined) payload.highlights = input.highlights
  if (input.statistics !== undefined) payload.statistics = input.statistics
  if (input.coverAlt !== undefined) payload.cover_alt = input.coverAlt || null
  if (input.reportFileId !== undefined) payload.report_file_id = input.reportFileId
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder
  const { data, error } = await supabase.from('year_summaries').update(payload).eq('id', id).select(yearSelect).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'Year summary not found.')
  return { item: mapAdminYear(data as unknown as YearRow) }
})
