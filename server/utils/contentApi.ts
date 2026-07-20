import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { ContentStatus } from '~/types/content'
import type { AdminFileResource, AdminPost, AdminYearSummary, CoreFaqItem, CoreSiteSettings, MapLocation, PublicFileResource, PublicPost, PublicYearSummary } from '~/types/coreContent'

export interface PostRow {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  cover_storage_path: string | null
  cover_alt: string | null
  status: ContentStatus
  published_at: string | null
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface FileRow {
  id: string
  title: string
  description: string | null
  academic_year: number | null
  category: string | null
  storage_path: string | null
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
  status: ContentStatus
  published_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface FaqRow {
  id: string
  question: string
  answer: string
  sort_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface YearRow {
  id: string
  academic_year: number
  title: string
  theme: string | null
  summary: string
  highlights: unknown
  statistics: unknown
  cover_storage_path: string | null
  cover_alt: string | null
  report_file_id: string | null
  status: ContentStatus
  published_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  report_file?: FileRow | FileRow[] | null
}

export interface SettingsRow {
  id: string
  site_name: string | null
  club_name_zh: string | null
  club_name_en: string | null
  slogan: string | null
  hero_title: string | null
  hero_subtitle: string | null
  about_summary: string | null
  logo_storage_path: string | null
  facebook_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  contact_text: string | null
  email: string | null
  phone: string | null
  map_locations: unknown
  default_seo_title: string | null
  default_seo_description: string | null
  footer_text: string | null
  updated_at: string
}

export const postSelect = 'id,title,slug,excerpt,content,cover_storage_path,cover_alt,status,published_at,is_featured,created_at,updated_at'
export const fileSelect = 'id,title,description,academic_year,category,storage_path,original_filename,mime_type,size_bytes,status,published_at,sort_order,created_at,updated_at'
export const faqSelect = 'id,question,answer,sort_order,is_visible,created_at,updated_at'
export const yearSelect = `id,academic_year,title,theme,summary,highlights,statistics,cover_storage_path,cover_alt,report_file_id,status,published_at,sort_order,created_at,updated_at,report_file:files!year_summaries_report_file_id_fkey(${fileSelect})`
export const settingsSelect = 'id,site_name,club_name_zh,club_name_en,slogan,hero_title,hero_subtitle,about_summary,logo_storage_path,facebook_url,instagram_url,youtube_url,contact_text,email,phone,map_locations,default_seo_title,default_seo_description,footer_text,updated_at'

const text = (value: string | null | undefined) => value ?? ''
const asHighlights = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const asStatistics = (value: unknown) => Array.isArray(value)
  ? value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const label = Reflect.get(item, 'label')
      const statisticValue = Reflect.get(item, 'value')
      return typeof label === 'string' && typeof statisticValue === 'string' ? [{ label, value: statisticValue }] : []
    })
  : []
const asLocations = (value: unknown): MapLocation[] => Array.isArray(value)
  ? value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const title = Reflect.get(item, 'title')
      const address = Reflect.get(item, 'address')
      const mapUrl = Reflect.get(item, 'mapUrl')
      return typeof title === 'string' && typeof address === 'string' && typeof mapUrl === 'string'
        ? [{ title, address, mapUrl }]
        : []
    })
  : []

export const mapPublicPost = (row: PostRow): PublicPost => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  excerpt: text(row.excerpt),
  content: row.content,
  coverUrl: row.cover_storage_path ? `/api/public/assets/posts/${row.id}/cover` : null,
  coverAlt: text(row.cover_alt) || row.title,
  isFeatured: row.is_featured,
  publishedAt: text(row.published_at)
})

export const mapAdminPost = (row: PostRow): AdminPost => ({
  ...mapPublicPost(row),
  coverUrl: row.cover_storage_path ? `/api/admin/posts/${row.id}/cover` : null,
  status: row.status,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  hasCover: Boolean(row.cover_storage_path)
})

export const mapPublicFile = (row: FileRow): PublicFileResource => ({
  id: row.id,
  title: row.title,
  description: text(row.description),
  academicYear: row.academic_year,
  category: text(row.category),
  originalFilename: text(row.original_filename) || row.title,
  mimeType: text(row.mime_type) || 'application/octet-stream',
  sizeBytes: Number(row.size_bytes ?? 0),
  publishedAt: text(row.published_at),
  downloadUrl: `/api/public/files/${row.id}/download`
})

export const mapAdminFile = (row: FileRow): AdminFileResource => ({
  ...mapPublicFile(row),
  originalFilename: text(row.original_filename),
  mimeType: text(row.mime_type),
  sizeBytes: Number(row.size_bytes ?? 0),
  downloadUrl: `/api/admin/files/${row.id}/download`,
  status: row.status,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  sortOrder: row.sort_order,
  hasUpload: Boolean(row.storage_path && row.original_filename && row.mime_type && row.size_bytes)
})

export const mapFaq = (row: FaqRow): CoreFaqItem => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  sortOrder: row.sort_order,
  isActive: row.is_visible,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const reportRow = (row: YearRow) => Array.isArray(row.report_file) ? row.report_file[0] ?? null : row.report_file ?? null

export const mapPublicYear = (row: YearRow): PublicYearSummary => ({
  id: row.id,
  academicYear: row.academic_year,
  title: row.title,
  theme: text(row.theme),
  summary: row.summary,
  highlights: asHighlights(row.highlights),
  statistics: asStatistics(row.statistics),
  coverUrl: row.cover_storage_path ? `/api/public/assets/years/${row.id}/cover` : null,
  coverAlt: text(row.cover_alt) || row.title,
  reportFile: reportRow(row) ? mapPublicFile(reportRow(row) as FileRow) : null,
  publishedAt: text(row.published_at)
})

export const mapAdminYear = (row: YearRow): AdminYearSummary => ({
  id: row.id,
  academicYear: row.academic_year,
  title: row.title,
  theme: text(row.theme),
  summary: row.summary,
  highlights: asHighlights(row.highlights),
  statistics: asStatistics(row.statistics),
  coverUrl: row.cover_storage_path ? `/api/admin/years/${row.id}/cover` : null,
  coverAlt: text(row.cover_alt) || row.title,
  status: row.status,
  publishedAt: row.published_at,
  reportFileId: row.report_file_id,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  hasCover: Boolean(row.cover_storage_path)
})

export const mapSettings = (row: SettingsRow): CoreSiteSettings => ({
  id: row.id,
  siteName: text(row.site_name),
  clubNameZh: text(row.club_name_zh),
  clubNameEn: text(row.club_name_en),
  slogan: text(row.slogan),
  heroTitle: text(row.hero_title),
  heroSubtitle: text(row.hero_subtitle),
  aboutSummary: text(row.about_summary),
  logoUrl: row.logo_storage_path ? '/api/public/assets/site/logo' : null,
  facebookUrl: text(row.facebook_url),
  instagramUrl: text(row.instagram_url),
  youtubeUrl: text(row.youtube_url),
  contactText: text(row.contact_text),
  email: text(row.email),
  phone: text(row.phone),
  locations: asLocations(row.map_locations),
  defaultSeoTitle: text(row.default_seo_title),
  defaultSeoDescription: text(row.default_seo_description),
  footerText: text(row.footer_text),
  updatedAt: row.updated_at
})

export const throwContentDatabaseError = (error: PostgrestError | null, conflictCode: 'SLUG_CONFLICT' | 'CONFLICT' = 'CONFLICT') => {
  if (!error) return
  if (error.code === '23505') throw apiError(409, conflictCode, 'A record with the same unique value already exists.')
  if (error.code === '23503') throw apiError(409, 'CONFLICT', 'A related record is unavailable.')
  throw internalApiError()
}

export const requireExistingRow = async (query: PromiseLike<{ data: any; error: PostgrestError | null }>): Promise<Record<string, any>> => {
  const { data, error } = await query
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'Resource not found.')
  return data
}

export const deleteStorageObject = async (supabase: SupabaseClient, bucket: string, path: string | null) => {
  if (!path) return false
  const { error } = await supabase.storage.from(bucket).remove([path])
  return Boolean(error)
}
