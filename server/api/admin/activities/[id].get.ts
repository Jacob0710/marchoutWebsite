import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  return { activity: await getAdminActivity(supabase, id) }
})
