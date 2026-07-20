import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Year summary')
  const current = await requireExistingRow(supabase.from('year_summaries').select('id,cover_storage_path').eq('id', id).maybeSingle())
  const { error } = await supabase.from('year_summaries').delete().eq('id', id)
  throwContentDatabaseError(error)
  const cleanupWarning = await deleteStorageObject(supabase, contentAssetsBucket, current.cover_storage_path)
  return { success: true, cleanupWarning }
})
