import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Post')
  const item = await requireExistingRow(supabase.from('posts').select(postSelect).eq('id', id).maybeSingle())
  return { item: mapAdminPost(item as unknown as PostRow) }
})
