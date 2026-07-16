import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const videoId = requireUuid(getRouterParam(event, 'videoId'), 'Video')
  const values = validateVideoPayload(await readBody(event), true)
  const patch = {
    ...('url' in values ? { url: values.url } : {}),
    ...('title' in values ? { title: values.title } : {}),
    ...('sortOrder' in values ? { sort_order: values.sortOrder } : {})
  }
  const { data, error } = await supabase.from('activity_videos').update(patch).eq('id', videoId).select('activity_id').maybeSingle()
  if (error) throw internalApiError()
  if (!data) throw apiError(404, 'NOT_FOUND', 'Video not found.')
  const activity = await getAdminActivity(supabase, data.activity_id)
  return { video: activity.videos.find((video) => video.id === videoId)! }
})
