import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  const { data: assets, error: assetError } = await supabase
    .from('activity_assets')
    .select('storage_path')
    .eq('activity_id', id)
  if (assetError) throw internalApiError()

  const { data: deleted, error: deleteError } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (deleteError) throw internalApiError()
  if (!deleted) throw apiError(404, 'NOT_FOUND', 'Activity not found.')

  const paths = (assets ?? []).map((asset) => asset.storage_path)
  if (paths.length) {
    const { error: cleanupError } = await supabase.storage.from(activityAssetsBucket).remove(paths)
    if (cleanupError) {
      console.error('Phase 6 activity Storage cleanup requires retry.', { activityId: id, paths })
      throw apiError(502, 'STORAGE_ERROR', 'Activity was deleted, but one or more stored files require cleanup.')
    }
  }
  return { deleted: true, cleanupComplete: true }
})
