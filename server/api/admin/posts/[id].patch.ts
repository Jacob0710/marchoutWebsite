import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Post')
  const input = validatePostInput(await readBody(event), true)
  const payload: Record<string, unknown> = { updated_by: user.id }
  if (input.title !== undefined) payload.title = input.title
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.excerpt !== undefined) payload.excerpt = input.excerpt || null
  if (input.content !== undefined) payload.content = input.content
  if (input.coverAlt !== undefined) payload.cover_alt = input.coverAlt || null
  if (input.isFeatured !== undefined) payload.is_featured = input.isFeatured
  const { data, error } = await supabase.from('posts').update(payload).eq('id', id).select(postSelect).maybeSingle()
  throwContentDatabaseError(error, 'SLUG_CONFLICT')
  if (!data) throw apiError(404, 'NOT_FOUND', 'Post not found.')
  return { item: mapAdminPost(data as unknown as PostRow) }
})
