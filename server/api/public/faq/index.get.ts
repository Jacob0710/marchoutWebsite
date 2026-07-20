import { defineEventHandler } from 'h3'
import { mockFaq } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  if (getContentDataMode(event) === 'mock') return { items: mockFaq.filter((item) => item.isVisible).map((item) => ({ ...item, isActive: item.isVisible })) }
  const supabase = createSupabaseAnonServerClient(event)
  const { data, error } = await supabase.from('faq').select(faqSelect).order('sort_order').order('id')
  throwContentDatabaseError(error)
  return { items: ((data ?? []) as unknown as FaqRow[]).map(mapFaq) }
})
