import { defineEventHandler, getQuery, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const status = parseInvitationStatus(getQuery(event).status)
  if (!status) throw apiError(400, 'VALIDATION_ERROR', 'Invalid status filter.')

  const { data, error } = await supabase.rpc('list_admin_invitations', { p_status: status })
  if (error) throwAdminAccessRpcError(error)
  return { invitations: (data ?? []).map((row: unknown) => mapAdminInvitation(row as Record<string, unknown>)) }
})
