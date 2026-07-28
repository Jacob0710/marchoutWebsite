import { defineEventHandler, readBody, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const input = parseSafetyCheckpoint(await readBody<unknown>(event))
  const { data, error } = await supabase.rpc('phase10_register_safety_checkpoint', {
    p_checkpoint_key: input.checkpointKey,
    p_environment: input.environment,
    p_database_backup_id: input.databaseBackupId,
    p_database_evidence_sha256: input.databaseEvidenceSha256,
    p_storage_inventory_sha256: input.storageInventorySha256,
    p_restore_evidence_sha256: input.restoreEvidenceSha256,
    p_restore_rehearsed_at: input.restoreRehearsedAt,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  return { checkpoint: camelizeEditorial(data) }
})
