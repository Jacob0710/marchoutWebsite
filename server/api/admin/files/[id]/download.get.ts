import { defineEventHandler, getRouterParam, sendRedirect, setResponseHeader } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const row = await requireExistingRow(supabase.from('files').select('storage_path,original_filename').eq('id', id).maybeSingle())
  if (!row.storage_path || !row.original_filename) throw apiError(404, 'NOT_FOUND', 'File upload not found.')
  const { data, error } = await supabase.storage.from(downloadsBucket).createSignedUrl(row.storage_path, signedContentUrlLifetimeSeconds, { download: safeDownloadName(row.original_filename) })
  if (error || !data.signedUrl) throw apiError(404, 'NOT_FOUND', 'File upload not found.')
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return sendRedirect(event, data.signedUrl, 302)
})
