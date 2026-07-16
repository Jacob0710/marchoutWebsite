import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  const activity = await getAdminActivity(supabase, id)
  validatePublishable({
    title: activity.title, slug: activity.slug, academic_year: activity.academicYear,
    activity_type: activity.activityType, event_date: activity.eventDate, location: activity.location,
    participants_count: activity.participantsCount, result_summary: activity.resultSummary, content: activity.content
  })
  if (activity.coverAssetId && !activity.assets.some((asset) => asset.id === activity.coverAssetId && asset.kind === 'image')) {
    throw apiError(400, 'VALIDATION_ERROR', 'Cover image is invalid.', { coverAssetId: ['封面必須是同一活動的圖片。'] })
  }
  const now = new Date().toISOString()
  const { error } = await supabase.from('activities').update({
    status: 'published', published_at: activity.publishedAt ?? now, updated_at: now, updated_by: user.id
  }).eq('id', id)
  if (error) throw internalApiError()
  return { activity: await getAdminActivity(supabase, id) }
})
