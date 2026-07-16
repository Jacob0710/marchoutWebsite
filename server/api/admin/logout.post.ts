import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  try {
    const supabase = createSupabaseServerClient(event)
    const { error } = await supabase.auth.signOut()

    if (error) return sendAdminApiError(event, 503)
    return { success: true }
  } catch {
    return sendAdminApiError(event, 503)
  }
})
