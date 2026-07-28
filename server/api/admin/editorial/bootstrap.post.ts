import { defineEventHandler, readBody, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const input = parseEditorialBootstrap(await readBody<unknown>(event))
  const { data, error } = await supabase.rpc('phase10_bootstrap_editorial', {
    p_source_snapshot_sha256: input.sourceSnapshotSha256,
    p_manifest_sha256: input.manifestSha256,
    p_targets: input.targets,
    p_redirects: input.redirects,
    p_reviews: input.reviews,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  return { bootstrap: camelizeEditorial(data?.[0] ?? null) }
})
