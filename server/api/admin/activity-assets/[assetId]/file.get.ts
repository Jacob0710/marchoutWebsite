import { getQuery, getRouterParam } from 'h3'

export default defineStorageProxyHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const assetId = requireUuid(getRouterParam(event, 'assetId'), 'Asset')
  const { data: asset, error } = await supabase.from('activity_assets')
    .select('storage_path,original_name,mime_type,size_bytes')
    .eq('id', assetId)
    .maybeSingle()
  if (error) throw internalApiError()
  if (!asset) throw apiError(404, 'NOT_FOUND', 'Asset not found.')
  const download = getQuery(event).download === '1'
  return sendStorageProxyObject({
    event,
    supabase,
    bucket: activityAssetsBucket,
    path: asset.storage_path,
    kind: asset.mime_type.startsWith('image/') ? 'image' : 'download',
    expectedMimeType: asset.mime_type,
    expectedSizeBytes: asset.size_bytes,
    disposition: download ? 'attachment' : 'inline',
    downloadName: asset.original_name
  })
})
