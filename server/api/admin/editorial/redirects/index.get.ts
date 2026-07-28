import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const { data, error } = await supabase.rpc('phase10_list_redirects')
  throwEditorialRpcError(error)
  return { items: camelizeEditorial(data ?? []) }
})
