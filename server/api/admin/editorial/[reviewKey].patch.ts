import { defineEventHandler, getRouterParam, readBody, setResponseHeader } from 'h3'
import type { EditorialReviewDetail } from '~/types/editorial'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const reviewKey = requireEditorialReviewKey(getRouterParam(event, 'reviewKey'))
  const input = parseEditorialReviewUpdate(await readBody<unknown>(event))
  const { data, error } = await supabase.rpc('phase10_update_editorial_review', {
    p_review_key: reviewKey,
    p_state: input.state,
    p_decision: input.decision,
    p_decision_reason: input.decisionReason,
    p_content_verified: input.contentVerified,
    p_privacy_verified: input.privacyVerified,
    p_authorization_verified: input.authorizationVerified,
    p_public_target_verified: input.publicTargetVerified,
    p_target_version: input.targetVersion,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  return { item: camelizeEditorial(data) as EditorialReviewDetail }
})
