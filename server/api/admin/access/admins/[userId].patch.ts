import { defineEventHandler, getRouterParam, readBody, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  const userId = parseAdminUuid(getRouterParam(event, 'userId'))
  if (!userId) throw apiError(404, 'ADMIN_NOT_FOUND', 'Administrator not found.')

  let body: unknown
  try { body = await readBody<unknown>(event) } catch { throw apiError(400, 'VALIDATION_ERROR', 'Invalid request.') }
  const input = parseUpdateAdminAccess(body)
  if (!input) throw apiError(400, 'VALIDATION_ERROR', 'Invalid request.')

  const { data, error } = await supabase.rpc('set_admin_active', {
    p_target_user_id: userId,
    p_is_active: input.isActive
  })
  if (error) throwAdminAccessRpcError(error)
  const row = data?.[0]
  if (!row) throw internalApiError()
  return {
    admin: {
      userId: row.admin_user_id,
      email: row.admin_email,
      isActive: row.admin_is_active,
      grantedAt: row.admin_granted_at,
      deactivatedAt: row.admin_deactivated_at,
      updatedAt: row.admin_updated_at
    }
  }
})
