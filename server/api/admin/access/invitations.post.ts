import { defineEventHandler, readBody, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  let body: unknown
  try { body = await readBody<unknown>(event) } catch { throw apiError(400, 'VALIDATION_ERROR', 'Invalid request.') }
  const input = parseCreateAdminInvitation(body)
  if (!input) throw apiError(400, 'VALIDATION_ERROR', 'Invalid request.')

  const { data, error } = await supabase.rpc('create_admin_invitation', {
    p_email: input.email,
    p_expires_in_days: input.expiresInDays
  })
  if (error) throwAdminAccessRpcError(error)
  const row = data?.[0]
  if (!row || typeof row.raw_token !== 'string') throw internalApiError()

  const inviteUrl = buildAdminInviteUrl(event, row.raw_token)
  return {
    invitation: {
      id: row.invitation_id,
      email: row.invitation_email,
      expiresAt: row.invitation_expires_at
    },
    inviteUrl
  }
})
