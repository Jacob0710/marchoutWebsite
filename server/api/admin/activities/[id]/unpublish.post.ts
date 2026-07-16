import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  await getAdminActivity(supabase, id)
  const { error } = await supabase.from('activities').update({
    status: 'draft', published_at: null, updated_at: new Date().toISOString(), updated_by: user.id
  }).eq('id', id)
  if (error) throw internalApiError()
  return { activity: await getAdminActivity(supabase, id) }
})
