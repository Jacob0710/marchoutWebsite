import { defineEventHandler, setResponseHeader } from 'h3'
import type { EditorialReconciliation } from '~/types/editorial'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const { data, error } = await supabase.rpc('phase10_editorial_reconciliation')
  throwEditorialRpcError(error)
  return { reconciliation: camelizeEditorial(data) as EditorialReconciliation }
})
