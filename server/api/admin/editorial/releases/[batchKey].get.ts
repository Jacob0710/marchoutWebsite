import { defineEventHandler, getRouterParam, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const batchKey = requireReleaseBatchKey(getRouterParam(event, 'batchKey'))
  const { data, error } = await supabase.rpc('phase10_get_release_batch', { p_batch_key: batchKey })
  throwEditorialRpcError(error)
  return { item: camelizeEditorial(data) }
})
