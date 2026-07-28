import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const assetId = requireUuid(getRouterParam(event, 'assetId'), 'Asset')
  await requirePhase10ActivityAssetDeleteAllowed(supabase, assetId)
  const { data: asset, error } = await supabase.from('activity_assets').select('storage_path').eq('id', assetId).maybeSingle()
  if (error) throw internalApiError()
  if (!asset) throw apiError(404, 'NOT_FOUND', 'Asset not found.')
  const { error: metadataError } = await supabase.from('activity_assets').delete().eq('id', assetId)
  if (metadataError) throw internalApiError()
  const { error: storageError } = await supabase.storage.from(activityAssetsBucket).remove([asset.storage_path])
  if (storageError) throw apiError(502, 'STORAGE_ERROR', 'Asset metadata was deleted, but Storage cleanup requires retry.')
  return { deleted: true, cleanupComplete: true }
})
