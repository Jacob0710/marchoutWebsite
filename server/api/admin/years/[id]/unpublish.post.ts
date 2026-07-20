import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Year summary')
  const { data, error } = await supabase.from('year_summaries').update({ status: 'draft', published_at: null, updated_by: user.id }).eq('id', id).select(yearSelect).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'Year summary not found.')
  return { item: mapAdminYear(data as unknown as YearRow) }
})
