import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Year summary')
  const item = await requireExistingRow(supabase.from('year_summaries').select(yearSelect).eq('id', id).maybeSingle())
  return { item: mapAdminYear(item as unknown as YearRow) }
})
