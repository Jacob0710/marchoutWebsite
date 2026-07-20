import { defineEventHandler, getRouterParam, readBody } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'FAQ')
  const input = validateFaqInput(await readBody(event), true)
  const payload: Record<string, unknown> = { updated_by: user.id }
  if (input.question !== undefined) payload.question = input.question
  if (input.answer !== undefined) payload.answer = input.answer
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder
  if (input.isActive !== undefined) payload.is_visible = input.isActive
  const { data, error } = await supabase.from('faq').update(payload).eq('id', id).select(faqSelect).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'FAQ not found.')
  return { item: mapFaq(data as unknown as FaqRow) }
})
