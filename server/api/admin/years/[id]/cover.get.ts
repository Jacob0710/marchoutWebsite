import { defineEventHandler, getRouterParam, sendRedirect, setResponseHeader } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Year summary')
  const row = await requireExistingRow(supabase.from('year_summaries').select('cover_storage_path').eq('id', id).maybeSingle())
  if (!row.cover_storage_path) throw apiError(404, 'NOT_FOUND', 'Cover not found.')
  const { data, error } = await supabase.storage.from(contentAssetsBucket).createSignedUrl(row.cover_storage_path, signedContentUrlLifetimeSeconds)
  if (error || !data.signedUrl) throw apiError(404, 'NOT_FOUND', 'Cover not found.')
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return sendRedirect(event, data.signedUrl, 302)
})
