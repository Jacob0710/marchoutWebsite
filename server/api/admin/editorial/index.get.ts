import { defineEventHandler, getQuery, setResponseHeader } from 'h3'
import type { EditorialQueueResponse, EditorialReconciliation, EditorialReviewListItem } from '~/types/editorial'

export default defineEventHandler(async (event): Promise<EditorialQueueResponse> => {
  const { supabase } = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const filters = parseEditorialFilters(getQuery(event))
  const [queue, reconciliation] = await Promise.all([
    supabase.rpc('phase10_list_editorial_reviews', {
      p_state: filters.state,
      p_severity: filters.severity,
      p_target_kind: filters.targetKind,
      p_query: filters.search,
      p_limit: filters.limit,
      p_offset: filters.offset
    }),
    supabase.rpc('phase10_editorial_reconciliation')
  ])
  throwEditorialRpcError(queue.error)
  throwEditorialRpcError(reconciliation.error)
  const rows = (camelizeEditorial(queue.data ?? []) as EditorialReviewListItem[])
  return {
    items: rows,
    total: Number((queue.data?.[0] as Record<string, unknown> | undefined)?.total_count ?? 0),
    reconciliation: camelizeEditorial(reconciliation.data) as EditorialReconciliation
  }
})
