import { defineEventHandler, readBody, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  requireSecureAcceptanceOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  let body: unknown
  try { body = await readBody<unknown>(event) } catch { throw apiError(400, 'VALIDATION_ERROR', 'Invalid request.') }
  const input = parseAcceptAdminInvitation(body)
  if (!input) throw apiError(400, 'VALIDATION_ERROR', 'Invalid request.')

  const supabase = createSupabaseServerClient(event)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password
  })
  if (signInError || !signInData.user) {
    await supabase.auth.signOut({ scope: 'local' })
    throw apiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.')
  }

  const { error: invitationError } = await supabase.rpc('accept_admin_invitation', { p_token: input.token })
  if (invitationError) {
    await supabase.auth.signOut({ scope: 'local' })
    throwAdminAccessRpcError(invitationError)
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
  if (adminError || isAdmin !== true) {
    await supabase.auth.signOut({ scope: 'local' })
    throw internalApiError()
  }

  return { success: true, redirectTo: '/admin' as const }
})
