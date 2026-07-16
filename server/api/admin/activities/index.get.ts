import { defineEventHandler, getQuery } from 'h3'
import type { ActivityType, ContentStatus } from '~/types/content'
import { activityTypes } from '~/shared/activityRules'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : 'all'
  const category = typeof query.category === 'string' ? query.category : ''
  const keyword = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''
  const year = typeof query.year === 'string' && /^\d{1,3}$/.test(query.year) ? Number(query.year) : null

  if (!['all', 'draft', 'published'].includes(status)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid status filter.')
  if (category && !activityTypes.includes(category as ActivityType)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid category filter.')

  let request = supabase
    .from('activities')
    .select(adminActivitySelect)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })
  if (status !== 'all') request = request.eq('status', status as ContentStatus)
  if (category) request = request.eq('activity_type', category)
  if (year !== null) request = request.eq('academic_year', year)
  if (keyword) request = request.or(`title.ilike.%${keyword.replace(/[%_,()]/g, '')}%,slug.ilike.%${keyword.replace(/[%_,()]/g, '')}%`)

  const { data, error } = await request
  if (error) throw internalApiError()
  return { activities: (data ?? []).map((row) => mapAdminActivityListRow(row as never)) }
})
