import { defineEventHandler, getQuery, getRouterParam, sendRedirect, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const assetId = requireUuid(getRouterParam(event, 'assetId'), 'Asset')
  const { data: asset, error } = await supabase.from('activity_assets')
    .select('storage_path,original_name')
    .eq('id', assetId)
    .maybeSingle()
  if (error) throw internalApiError()
  if (!asset) throw apiError(404, 'NOT_FOUND', 'Asset not found.')
  const download = getQuery(event).download === '1'
  const { data, error: signedError } = await supabase.storage.from(activityAssetsBucket).createSignedUrl(
    asset.storage_path,
    signedAssetUrlLifetimeSeconds,
    download ? { download: safeDownloadName(asset.original_name) } : undefined
  )
  if (signedError || !data.signedUrl) throw apiError(502, 'STORAGE_ERROR', 'Asset preview is temporarily unavailable.')
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  return sendRedirect(event, data.signedUrl, 302)
})
