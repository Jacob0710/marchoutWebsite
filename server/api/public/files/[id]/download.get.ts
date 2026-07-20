import { defineEventHandler, getRouterParam, sendRedirect, setResponseHeader } from 'h3'
export default defineEventHandler(async (event) => {
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const supabase = createSupabaseAnonServerClient(event)
  const { data: row, error } = await supabase.from('files').select('storage_path,original_filename').eq('id', id).maybeSingle()
  if (error || !row?.storage_path || !row.original_filename) throw apiError(404, 'NOT_FOUND', 'File not found.')
  const { data, error: signedError } = await supabase.storage.from(downloadsBucket).createSignedUrl(row.storage_path, signedContentUrlLifetimeSeconds, { download: safeDownloadName(row.original_filename) })
  if (signedError || !data.signedUrl) throw apiError(404, 'NOT_FOUND', 'File not found.')
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return sendRedirect(event, data.signedUrl, 302)
})
