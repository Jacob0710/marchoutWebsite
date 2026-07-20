import { defineEventHandler, readBody } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const input = validateSettingsInput(await readBody(event))
  const map: Record<string, string> = {
    siteName: 'site_name', clubNameZh: 'club_name_zh', clubNameEn: 'club_name_en', slogan: 'slogan',
    heroTitle: 'hero_title', heroSubtitle: 'hero_subtitle', aboutSummary: 'about_summary',
    facebookUrl: 'facebook_url', instagramUrl: 'instagram_url', youtubeUrl: 'youtube_url',
    contactText: 'contact_text', email: 'email', phone: 'phone', locations: 'map_locations',
    defaultSeoTitle: 'default_seo_title', defaultSeoDescription: 'default_seo_description', footerText: 'footer_text'
  }
  const payload: Record<string, unknown> = { updated_by: user.id }
  for (const [key, value] of Object.entries(input)) payload[map[key]!] = value || (key === 'locations' ? [] : null)
  const { data, error } = await supabase.from('site_settings').update(payload).eq('singleton_key', true).select(settingsSelect).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'Site settings are not configured.')
  return { item: mapSettings(data as unknown as SettingsRow) }
})
