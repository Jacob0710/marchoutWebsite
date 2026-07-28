import { defineEventHandler, getRouterParam, setResponseHeader } from 'h3'
import type { EditorialReviewDetail } from '~/types/editorial'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const reviewKey = requireEditorialReviewKey(getRouterParam(event, 'reviewKey'))
  const { data, error } = await supabase.rpc('phase10_get_editorial_review', { p_review_key: reviewKey })
  throwEditorialRpcError(error)
  return { item: camelizeEditorial(data) as EditorialReviewDetail }
})
