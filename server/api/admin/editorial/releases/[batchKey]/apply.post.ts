import { defineEventHandler, getRouterParam, readBody, setResponseHeader } from 'h3'
import type { ReleaseBatchResult } from '~/types/editorial'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const batchKey = requireReleaseBatchKey(getRouterParam(event, 'batchKey'))
  const input = parseBatchApply(await readBody<unknown>(event))
  const { data, error } = await supabase.rpc('phase10_apply_release_batch', {
    p_batch_key: batchKey,
    p_checkpoint_token: input.checkpointToken,
    p_max_items: input.maxItems,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  return { batch: camelizeEditorial(data) as ReleaseBatchResult }
})
