import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Post')
  const current = await requireExistingRow(supabase.from('posts').select(postSelect).eq('id', id).maybeSingle()) as unknown as PostRow
  if (!current.title.trim() || !current.slug.trim() || !current.content.trim()) throw apiError(400, 'VALIDATION_ERROR', 'Post is not ready to publish.')
  const { data, error } = await supabase.from('posts').update({ status: 'published', published_at: new Date().toISOString(), updated_by: user.id }).eq('id', id).select(postSelect).single()
  throwContentDatabaseError(error)
  return { item: mapAdminPost(data as unknown as PostRow) }
})
