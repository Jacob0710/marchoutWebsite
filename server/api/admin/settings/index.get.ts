import { defineEventHandler } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const item = await requireExistingRow(supabase.from('site_settings').select(settingsSelect).eq('singleton_key', true).maybeSingle())
  return { item: mapSettings(item as unknown as SettingsRow) }
})
