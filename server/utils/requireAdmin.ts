import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createError, type H3Event } from 'h3'

interface AdminContext {
  supabase: SupabaseClient
  user: User
}

export const getHttpStatusCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return 500
  const statusCode = Reflect.get(error, 'statusCode')
  return typeof statusCode === 'number' ? statusCode : 500
}

export const requireAdmin = async (event: H3Event): Promise<AdminContext> => {
  const supabase = createSupabaseServerClient(event)
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
  if (adminError) {
    throw createError({ statusCode: 503, statusMessage: 'Authorization service unavailable.' })
  }

  if (isAdmin !== true) {
    throw createError({ statusCode: 403, statusMessage: 'Administrator access required.' })
  }

  return { supabase, user: userData.user }
}
