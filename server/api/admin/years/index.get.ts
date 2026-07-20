import { defineEventHandler, getQuery } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const status = validateStatusQuery(getQuery(event).status)
  let request = supabase.from('year_summaries').select(yearSelect, { count: 'exact' })
  if (status !== 'all') request = request.eq('status', status)
  const { data, error, count } = await request.order('academic_year', { ascending: false }).order('id')
  throwContentDatabaseError(error)
  return { items: ((data ?? []) as unknown as YearRow[]).map(mapAdminYear), total: count ?? 0 }
})
