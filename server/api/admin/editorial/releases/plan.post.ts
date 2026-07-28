import { defineEventHandler, readBody, setResponseHeader } from 'h3'
import type { ReleaseBatchResult } from '~/types/editorial'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const input = parseReleasePlan(await readBody<unknown>(event))
  const environment = String(useRuntimeConfig(event).phase10Environment || '')
  const { data, error } = await supabase.rpc('phase10_plan_release_batch', {
    p_batch_key: input.batchKey,
    p_manifest_sha256: input.manifestSha256,
    p_source_keys: input.sourceKeys,
    p_manifest_items: input.items,
    p_mode: input.mode,
    p_environment: environment,
    p_safety_checkpoint_key: input.safetyCheckpointKey,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  return { batch: camelizeEditorial(data) as ReleaseBatchResult }
})
