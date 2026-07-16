import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { createError, parseCookies, setCookie, setResponseHeader, type H3Event } from 'h3'

export const createSupabaseServerClient = (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const supabaseUrl = config.public.supabaseUrl.trim()
  const supabaseAnonKey = config.public.supabaseAnonKey.trim()

  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({ statusCode: 503, statusMessage: 'Authentication service unavailable.' })
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return Object.entries(parseCookies(event)).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(event, name, value, {
            ...options,
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure: import.meta.env.PROD
          })
        }

        for (const [name, value] of Object.entries(headers)) {
          setResponseHeader(event, name, value)
        }
      }
    },
    auth: {
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true
    }
  })
}

export const createSupabaseAnonServerClient = (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const supabaseUrl = config.public.supabaseUrl.trim()
  const supabaseAnonKey = config.public.supabaseAnonKey.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({ statusCode: 503, statusMessage: 'Content service unavailable.' })
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}
