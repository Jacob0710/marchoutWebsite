import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

const isConfiguredValue = (value?: string) => Boolean(value && value.trim().length > 0)

export const useSupabaseConfig = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  return {
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured: isConfiguredValue(supabaseUrl) && isConfiguredValue(supabaseAnonKey)
  }
}

export const useSupabaseClient = () => {
  const { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } = useSupabaseConfig()

  if (!isSupabaseConfigured) {
    return null
  }

  if (import.meta.client) {
    browserClient ??= createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
    return browserClient
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}
