import { defineEventHandler, getRouterParam, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const invitationId = parseAdminUuid(getRouterParam(event, 'id'))
  if (!invitationId) throw apiError(404, 'INVITATION_NOT_FOUND', 'Invitation not found.')

  const { data, error } = await supabase.rpc('revoke_admin_invitation', { p_invitation_id: invitationId })
  if (error) throwAdminAccessRpcError(error)
  const row = data?.[0]
  if (!row) throw internalApiError()
  return {
    invitation: {
      id: row.invitation_id,
      email: row.invitation_email,
      revokedAt: row.invitation_revoked_at
    }
  }
})
