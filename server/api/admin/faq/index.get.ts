import { defineEventHandler } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const { data, error } = await supabase.from('faq').select(faqSelect).order('sort_order').order('id')
  throwContentDatabaseError(error)
  return { items: ((data ?? []) as unknown as FaqRow[]).map(mapFaq) }
})
