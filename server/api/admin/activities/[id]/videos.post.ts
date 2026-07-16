import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  await getAdminActivity(supabase, id)
  const values = validateVideoPayload(await readBody(event))
  const { data, error } = await supabase.from('activity_videos').insert({
    activity_id: id,
    url: values.url!,
    title: values.title ?? null,
    sort_order: values.sortOrder ?? 0,
    created_by: user.id
  }).select('id').single()
  if (error) throw internalApiError()
  const activity = await getAdminActivity(supabase, id)
  return { video: activity.videos.find((video) => video.id === data.id)! }
})
