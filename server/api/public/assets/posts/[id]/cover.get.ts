import { getRouterParam } from 'h3'
export default defineStorageProxyHandler(async (event) => {
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Cover')
  const supabase = createSupabaseAnonServerClient(event)
  const { data: row, error } = await supabase.from('posts').select('cover_storage_path').eq('id', id).maybeSingle()
  if (error || !row?.cover_storage_path) throw apiError(404, 'NOT_FOUND', 'Cover not found.')
  return sendStorageProxyObject({
    event,
    supabase,
    bucket: contentAssetsBucket,
    path: row.cover_storage_path,
    kind: 'image'
  })
})
