import { getRouterParam } from 'h3'

export default defineStorageProxyHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Post')
  const row = await requireExistingRow(supabase.from('posts').select('cover_storage_path').eq('id', id).maybeSingle())
  if (!row.cover_storage_path) throw apiError(404, 'NOT_FOUND', 'Cover not found.')
  return sendStorageProxyObject({ event, supabase, bucket: contentAssetsBucket, path: row.cover_storage_path, kind: 'image' })
})
