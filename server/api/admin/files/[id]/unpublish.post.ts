import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const { data: managed, error: gateError } = await supabase.rpc('phase10_unpublish_managed_target', {
    p_target_kind: 'file', p_target_id: id, p_correlation_id: crypto.randomUUID()
  })
  if (!isPhase10RpcUnavailable(gateError)) throwEditorialRpcError(gateError)
  if (managed === true) {
    const { data } = await supabase.from('files').select(fileSelect).eq('id', id).maybeSingle()
    if (!data) throw apiError(404, 'NOT_FOUND', 'File not found.')
    return { item: mapAdminFile(data as unknown as FileRow) }
  }
  const { data, error } = await supabase.from('files').update({ status: 'draft', published_at: null, updated_by: user.id }).eq('id', id).select(fileSelect).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'File not found.')
  return { item: mapAdminFile(data as unknown as FileRow) }
})
