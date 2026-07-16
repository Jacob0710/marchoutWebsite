import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const assetId = requireUuid(getRouterParam(event, 'assetId'), 'Asset')
  const { data: asset, error } = await supabase.from('activity_assets').select('storage_path').eq('id', assetId).maybeSingle()
  if (error) throw internalApiError()
  if (!asset) throw apiError(404, 'NOT_FOUND', 'Asset not found.')
  const { error: storageError } = await supabase.storage.from(activityAssetsBucket).remove([asset.storage_path])
  if (storageError) throw apiError(502, 'STORAGE_ERROR', 'Stored file could not be removed.')
  const { error: metadataError } = await supabase.from('activity_assets').delete().eq('id', assetId)
  if (metadataError) throw internalApiError()
  return { deleted: true }
})
