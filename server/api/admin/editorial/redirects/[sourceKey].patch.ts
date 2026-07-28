import { defineEventHandler, getRouterParam, readBody, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const redirectKey = requireEditorialRedirectKey(getRouterParam(event, 'sourceKey'))
  const input = parseRedirectDecision(await readBody<unknown>(event))
  const { data, error } = await supabase.rpc('phase10_decide_redirect', {
    p_redirect_key: redirectKey,
    p_decision: input.decision,
    p_decision_reason: input.decisionReason,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  return { redirect: camelizeEditorial(data) }
})
