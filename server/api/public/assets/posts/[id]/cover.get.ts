import { defineEventHandler, getRouterParam, sendRedirect, setResponseHeader } from 'h3'
export default defineEventHandler(async (event) => {
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Cover')
  const supabase = createSupabaseAnonServerClient(event)
  const { data: row, error } = await supabase.from('posts').select('cover_storage_path').eq('id', id).maybeSingle()
  if (error || !row?.cover_storage_path) throw apiError(404, 'NOT_FOUND', 'Cover not found.')
  const { data, error: signedError } = await supabase.storage.from(contentAssetsBucket).createSignedUrl(row.cover_storage_path, signedContentUrlLifetimeSeconds)
  if (signedError || !data.signedUrl) throw apiError(404, 'NOT_FOUND', 'Cover not found.')
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return sendRedirect(event, data.signedUrl, 302)
})
