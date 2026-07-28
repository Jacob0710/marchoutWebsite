import { defineEventHandler, getRouterParam, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const batchKey = requireReleaseBatchKey(getRouterParam(event, 'batchKey'))
  const { data, error } = await supabase.rpc('phase10_verify_release_batch', {
    p_batch_key: batchKey,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  return { verification: camelizeEditorial(data) }
})
