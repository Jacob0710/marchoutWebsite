import { getQuery, getRouterParam } from 'h3'

export default defineStorageProxyHandler(async (event) => {
  const assetId = requireUuid(getRouterParam(event, 'assetId'), 'Asset')
  const supabase = createSupabaseAnonServerClient(event)
  const { data: rows, error } = await supabase.rpc('phase10_get_public_activity_asset', { p_asset_id: assetId })
  let asset = rows?.[0]
  if (isPhase10RpcUnavailable(error)) {
    const fallback = await supabase.from('activity_assets').select('storage_path,original_name,mime_type,size_bytes,activities!activity_assets_activity_id_fkey!inner(status,published_at)')
      .eq('id', assetId).eq('activities.status', 'published').lte('activities.published_at', new Date().toISOString()).maybeSingle()
    if (!fallback.error && fallback.data) asset = {
      active_storage_path: fallback.data.storage_path,
      download_name: fallback.data.original_name,
      active_mime_type: fallback.data.mime_type,
      active_size_bytes: fallback.data.size_bytes
    }
  }
  if ((error && !isPhase10RpcUnavailable(error)) || !asset?.active_storage_path || !asset.download_name) throw apiError(404, 'NOT_FOUND', 'Asset not found.')
  const download = getQuery(event).download === '1'
  return sendStorageProxyObject({
    event,
    supabase,
    bucket: activityAssetsBucket,
    path: asset.active_storage_path,
    kind: asset.active_mime_type?.startsWith('image/') ? 'image' : 'download',
    expectedMimeType: asset.active_mime_type,
    expectedSizeBytes: asset.active_size_bytes,
    expectedSha256: asset.active_sha256,
    disposition: download ? 'attachment' : 'inline',
    downloadName: asset.download_name
  })
})
