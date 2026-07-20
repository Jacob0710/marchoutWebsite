import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Post')
  const current = await requireExistingRow(supabase.from('posts').select('id,cover_storage_path').eq('id', id).maybeSingle())
  const { data, error } = await supabase.from('posts').update({ cover_storage_path: null, updated_by: user.id }).eq('id', id).select(postSelect).single()
  throwContentDatabaseError(error)
  const cleanupWarning = await deleteStorageObject(supabase, contentAssetsBucket, current.cover_storage_path)
  return { item: mapAdminPost(data as unknown as PostRow), cleanupWarning }
})
