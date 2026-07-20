import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const current = await requireExistingRow(supabase.from('files').select('id,storage_path').eq('id', id).maybeSingle())
  const { error } = await supabase.from('files').delete().eq('id', id)
  throwContentDatabaseError(error)
  const cleanupWarning = await deleteStorageObject(supabase, downloadsBucket, current.storage_path)
  return { success: true, cleanupWarning }
})
