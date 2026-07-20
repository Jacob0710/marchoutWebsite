import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'FAQ')
  const item = await requireExistingRow(supabase.from('faq').select(faqSelect).eq('id', id).maybeSingle())
  return { item: mapFaq(item as unknown as FaqRow) }
})
