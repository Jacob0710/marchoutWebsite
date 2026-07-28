import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  await getAdminActivity(supabase, id)
  const { data: managed, error: gateError } = await supabase.rpc('phase10_unpublish_managed_target', {
    p_target_kind: 'activity', p_target_id: id, p_correlation_id: crypto.randomUUID()
  })
  if (!isPhase10RpcUnavailable(gateError)) throwEditorialRpcError(gateError)
  if (managed === true) return { activity: await getAdminActivity(supabase, id) }
  const { error } = await supabase.from('activities').update({
    status: 'draft', published_at: null, updated_at: new Date().toISOString(), updated_by: user.id
  }).eq('id', id)
  if (error) throw internalApiError()
  return { activity: await getAdminActivity(supabase, id) }
})
