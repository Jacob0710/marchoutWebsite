import type { H3Event } from 'h3'

export type ContentDataMode = 'mock' | 'supabase'

export const getContentDataMode = (event: H3Event): ContentDataMode => {
  const config = useRuntimeConfig(event)
  const hasUrl = Boolean(config.public.supabaseUrl.trim())
  const hasKey = Boolean(config.public.supabaseAnonKey.trim())
  if (hasUrl !== hasKey) {
    throw apiError(503, 'INTERNAL_ERROR', 'Content service configuration is incomplete.')
  }
  return hasUrl ? 'supabase' : 'mock'
}
