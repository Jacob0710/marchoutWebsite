import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const query = getQuery(event)
  const status = validateStatusQuery(query.status)
  const search = validateSearchQuery(query.search)
  let request = supabase.from('posts').select(postSelect, { count: 'exact' })
  if (status !== 'all') request = request.eq('status', status)
  if (search) request = request.or(`title.ilike.%${search.replace(/[%_,()]/g, '')}%,slug.ilike.%${search.replace(/[%_,()]/g, '')}%`)
  const { data, error, count } = await request.order('updated_at', { ascending: false }).order('id', { ascending: true }).limit(200)
  throwContentDatabaseError(error)
  return { items: ((data ?? []) as unknown as PostRow[]).map(mapAdminPost), total: count ?? 0 }
})
