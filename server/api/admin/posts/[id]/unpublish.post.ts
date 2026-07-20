import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Post')
  const { data, error } = await supabase.from('posts').update({ status: 'draft', published_at: null, updated_by: user.id }).eq('id', id).select(postSelect).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'Post not found.')
  return { item: mapAdminPost(data as unknown as PostRow) }
})
