import { defineEventHandler, readBody } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const ids = validateReorderIds(await readBody(event))
  const { error } = await supabase.rpc('reorder_faq', { p_ids: ids })
  if (error) {
    if (error.message.includes('NOT_FOUND')) throw apiError(404, 'NOT_FOUND', 'One or more FAQ records were not found.')
    if (error.message.includes('VALIDATION_ERROR')) throw apiError(400, 'VALIDATION_ERROR', 'FAQ reorder payload is invalid.')
    throw internalApiError()
  }
  const { data, error: listError } = await supabase.from('faq').select(faqSelect).order('sort_order').order('id')
  throwContentDatabaseError(listError)
  return { items: ((data ?? []) as unknown as FaqRow[]).map(mapFaq) }
})
