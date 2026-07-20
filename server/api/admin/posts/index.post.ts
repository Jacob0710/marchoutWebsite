import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const input = validatePostInput(await readBody(event))
  const { data, error } = await supabase.from('posts').insert({
    title: input.title!, slug: input.slug!, excerpt: input.excerpt || null,
    content: input.content!, cover_alt: input.coverAlt || null,
    is_featured: input.isFeatured ?? false, status: 'draft',
    created_by: user.id, updated_by: user.id
  }).select(postSelect).single()
  throwContentDatabaseError(error, 'SLUG_CONFLICT')
  return { item: mapAdminPost(data as unknown as PostRow) }
})
