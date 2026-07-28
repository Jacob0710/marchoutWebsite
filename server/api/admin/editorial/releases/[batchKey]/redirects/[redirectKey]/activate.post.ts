import { defineEventHandler, getRouterParam, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const batchKey = requireReleaseBatchKey(getRouterParam(event, 'batchKey'))
  const redirectKey = requireEditorialRedirectKey(getRouterParam(event, 'redirectKey'))
  const { data, error } = await supabase.rpc('phase10_activate_batch_redirect', {
    p_batch_key: batchKey,
    p_redirect_key: redirectKey,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  return { redirect: camelizeEditorial(data) }
})
