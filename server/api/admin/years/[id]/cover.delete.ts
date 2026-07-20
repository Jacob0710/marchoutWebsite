import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Year summary')
  const current = await requireExistingRow(supabase.from('year_summaries').select('id,cover_storage_path').eq('id', id).maybeSingle())
  const { data, error } = await supabase.from('year_summaries').update({ cover_storage_path: null, updated_by: user.id }).eq('id', id).select(yearSelect).single()
  throwContentDatabaseError(error)
  const cleanupWarning = await deleteStorageObject(supabase, contentAssetsBucket, current.cover_storage_path)
  return { item: mapAdminYear(data as unknown as YearRow), cleanupWarning }
})
