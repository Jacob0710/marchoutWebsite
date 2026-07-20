import { defineEventHandler } from 'h3'
import { siteSettings } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  if (getContentDataMode(event) === 'mock') return { item: {
    id: 'mock-settings', siteName: siteSettings.siteName, clubNameZh: siteSettings.clubNameZh,
    clubNameEn: siteSettings.clubNameEn, slogan: siteSettings.slogan, heroTitle: siteSettings.clubNameEn,
    heroSubtitle: siteSettings.slogan, aboutSummary: siteSettings.contactText, logoUrl: null,
    facebookUrl: siteSettings.facebookUrl, instagramUrl: siteSettings.instagramUrl, youtubeUrl: '',
    contactText: siteSettings.contactText, email: siteSettings.email, phone: siteSettings.phone,
    locations: siteSettings.locations, defaultSeoTitle: `${siteSettings.clubNameEn} | ${siteSettings.clubNameZh}`,
    defaultSeoDescription: siteSettings.slogan, footerText: siteSettings.siteName, updatedAt: new Date(0).toISOString()
  } }
  const supabase = createSupabaseAnonServerClient(event)
  const { data, error } = await supabase.from('site_settings').select(settingsSelect).eq('singleton_key', true).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(503, 'INTERNAL_ERROR', 'Site settings are not configured.')
  return { item: mapSettings(data as unknown as SettingsRow) }
})
