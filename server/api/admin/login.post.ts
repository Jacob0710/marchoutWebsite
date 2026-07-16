import { defineEventHandler, readBody } from 'h3'

interface LoginBody {
  email: string
  password: string
}

const parseLoginBody = (value: unknown): LoginBody | null => {
  if (!value || typeof value !== 'object') return null

  const email = Reflect.get(value, 'email')
  const password = Reflect.get(value, 'password')
  if (typeof email !== 'string' || typeof password !== 'string') return null

  const normalizedEmail = email.trim()
  if (!normalizedEmail || normalizedEmail.length > 254 || password.length < 6 || password.length > 256) return null
  return { email: normalizedEmail, password }
}

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  let rawBody: unknown
  try {
    rawBody = await readBody<unknown>(event)
  } catch {
    return sendAdminApiError(event, 400)
  }

  const body = parseLoginBody(rawBody)
  if (!body) {
    return sendAdminApiError(event, 400)
  }

  try {
    const supabase = createSupabaseServerClient(event)
    const { data, error } = await supabase.auth.signInWithPassword(body)
    if (error || !data.user) return sendAdminApiError(event, 401)

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
    if (adminError) {
      await supabase.auth.signOut()
      return sendAdminApiError(event, 503)
    }

    if (isAdmin !== true) return sendAdminApiError(event, 403)

    return {
      user: {
        email: data.user.email ?? '管理員'
      }
    }
  } catch {
    return sendAdminApiError(event, 503)
  }
})
