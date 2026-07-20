import { defineEventHandler, getRouterParam } from 'h3'
import { mockPosts } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.trim() ?? ''
  if (!slug || slug.length > 180) throw apiError(404, 'NOT_FOUND', 'Post not found.')
  if (getContentDataMode(event) === 'mock') {
    const item = mockPosts.find((post) => post.status === 'published' && post.slug === slug)
    if (!item) throw apiError(404, 'NOT_FOUND', 'Post not found.')
    return { item: { id: item.id, title: item.title, slug: item.slug, excerpt: item.excerpt, content: item.content, coverUrl: item.coverImageUrl || null, coverAlt: item.title, isFeatured: false, publishedAt: item.publishedAt } }
  }
  const supabase = createSupabaseAnonServerClient(event)
  const { data, error } = await supabase.from('posts').select(postSelect).eq('slug', slug).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'Post not found.')
  return { item: mapPublicPost(data as unknown as PostRow) }
})
