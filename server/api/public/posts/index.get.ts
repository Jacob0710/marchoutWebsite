import { defineEventHandler } from 'h3'
import { mockPosts } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  if (getContentDataMode(event) === 'mock') return { items: mockPosts.filter((item) => item.status === 'published').map((item) => ({
    id: item.id, title: item.title, slug: item.slug, excerpt: item.excerpt, content: item.content,
    coverUrl: item.coverImageUrl || null, coverAlt: item.title, isFeatured: false, publishedAt: item.publishedAt
  })) }
  const supabase = createSupabaseAnonServerClient(event)
  const { data, error } = await supabase.from('posts').select(postSelect).order('published_at', { ascending: false }).order('id')
  throwContentDatabaseError(error)
  return { items: ((data ?? []) as unknown as PostRow[]).map(mapPublicPost) }
})
