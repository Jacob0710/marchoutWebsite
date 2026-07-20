import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const query = getQuery(event)
  const status = validateStatusQuery(query.status)
  const search = validateSearchQuery(query.search)
  let request = supabase.from('files').select(fileSelect, { count: 'exact' })
  if (status !== 'all') request = request.eq('status', status)
  if (search) request = request.or(`title.ilike.%${search.replace(/[%_,()]/g, '')}%,category.ilike.%${search.replace(/[%_,()]/g, '')}%`)
  const { data, error, count } = await request.order('sort_order').order('updated_at', { ascending: false }).order('id').limit(200)
  throwContentDatabaseError(error)
  return { items: ((data ?? []) as unknown as FileRow[]).map(mapAdminFile), total: count ?? 0 }
})
