import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const videoId = requireUuid(getRouterParam(event, 'videoId'), 'Video')
  const { data, error } = await supabase.from('activity_videos').delete().eq('id', videoId).select('id').maybeSingle()
  if (error) throw internalApiError()
  if (!data) throw apiError(404, 'NOT_FOUND', 'Video not found.')
  return { deleted: true }
})
