import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const current = await requireExistingRow(supabase.from('files').select(fileSelect).eq('id', id).maybeSingle()) as unknown as FileRow
  if (!current.storage_path || !current.original_filename || !current.mime_type || !current.size_bytes) throw apiError(400, 'VALIDATION_ERROR', 'Upload a valid file before publishing.')
  const { data: managed, error: gateError } = await supabase.rpc('phase10_publish_managed_target', {
    p_target_kind: 'file', p_target_id: id, p_correlation_id: crypto.randomUUID()
  })
  if (!isPhase10RpcUnavailable(gateError)) throwEditorialRpcError(gateError)
  if (managed === true) {
    const refreshed = await requireExistingRow(supabase.from('files').select(fileSelect).eq('id', id).maybeSingle()) as unknown as FileRow
    return { item: mapAdminFile(refreshed) }
  }
  const { data, error } = await supabase.from('files').update({ status: 'published', published_at: new Date().toISOString(), updated_by: user.id }).eq('id', id).select(fileSelect).single()
  throwContentDatabaseError(error)
  return { item: mapAdminFile(data as unknown as FileRow) }
})
