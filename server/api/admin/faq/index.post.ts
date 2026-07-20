import { defineEventHandler, readBody } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const input = validateFaqInput(await readBody(event))
  const { data, error } = await supabase.from('faq').insert({
    question: input.question!, answer: input.answer!, sort_order: input.sortOrder ?? 0,
    is_visible: input.isActive ?? true, created_by: user.id, updated_by: user.id
  }).select(faqSelect).single()
  throwContentDatabaseError(error)
  return { item: mapFaq(data as unknown as FaqRow) }
})
