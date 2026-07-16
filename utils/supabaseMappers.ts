import type { Activity, ActivityFile, ActivityImage, ActivityVideo, FileResource, FAQItem, Post, SiteSettings } from '~/types/content'
import type {
  SupabaseActivityImageRow,
  SupabaseActivityAssetRow,
  SupabaseActivityRow,
  SupabaseActivityVideoRow,
  SupabaseFaqRow,
  SupabaseFileRow,
  SupabasePostRow,
  SupabaseSiteSettingsRow
} from '~/types/supabase'
import { siteSettings } from '~/utils/mockData'
import { toSafeVideoEmbedUrl } from '~/shared/activityRules'

export const fallbackActivityImageUrl =
  'https://images.unsplash.com/photo-1527525443983-6e60c75fff46?auto=format&fit=crop&w=1400&q=80'

export const mapActivityImageFromRow = (row: SupabaseActivityImageRow): ActivityImage => ({
  id: row.id,
  imageUrl: row.image_url,
  caption: row.caption ?? '',
  sortOrder: row.sort_order ?? 0
})

export const mapPublicAssetImage = (row: Pick<SupabaseActivityAssetRow, 'id' | 'alt_text' | 'sort_order'>): ActivityImage => ({
  id: row.id,
  imageUrl: `/api/public/activity-assets/${row.id}`,
  caption: row.alt_text ?? '',
  altText: row.alt_text ?? '',
  sortOrder: row.sort_order
})

export const mapPublicAssetFile = (row: Pick<SupabaseActivityAssetRow, 'id' | 'original_name' | 'mime_type' | 'size_bytes'>): ActivityFile => ({
  id: row.id,
  name: row.original_name,
  url: `/api/public/activity-assets/${row.id}?download=1`,
  mimeType: row.mime_type,
  sizeBytes: Number(row.size_bytes)
})

export const mapPublicVideo = (row: Pick<SupabaseActivityVideoRow, 'id' | 'url' | 'title' | 'sort_order'>): ActivityVideo => ({
  id: row.id,
  url: row.url,
  title: row.title ?? '活動影片',
  sortOrder: row.sort_order,
  embedUrl: toSafeVideoEmbedUrl(row.url) ?? undefined
})

export const mapActivityFromRow = (
  row: SupabaseActivityRow,
  images: ActivityImage[] = [],
  files: Activity['files'] = [],
  videos: ActivityVideo[] = []
): Activity => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  academicYear: row.academic_year,
  activityType: row.activity_type,
  eventDate: row.event_date ?? '',
  location: row.location ?? '',
  participantsCount: row.participants_count ?? 0,
  resultSummary: row.result_summary ?? '',
  content: row.content ?? '',
  coverImageUrl: row.cover_asset_id
    ? `/api/public/activity-assets/${row.cover_asset_id}`
    : row.cover_image_url || fallbackActivityImageUrl,
  videoUrl: row.video_url ? toSafeVideoEmbedUrl(row.video_url) ?? undefined : undefined,
  status: row.status,
  isFeatured: row.is_featured,
  tags: row.tags ?? [],
  images,
  files,
  videos
})

export const mapActivityToPayload = (activity: Partial<Activity>) => ({
  title: activity.title,
  slug: activity.slug,
  academic_year: activity.academicYear,
  activity_type: activity.activityType,
  event_date: activity.eventDate || null,
  location: activity.location || null,
  participants_count: activity.participantsCount ?? 0,
  result_summary: activity.resultSummary || null,
  content: activity.content || null,
  cover_image_url: activity.coverImageUrl || null,
  video_url: activity.videoUrl || null,
  status: activity.status ?? 'draft',
  is_featured: activity.isFeatured ?? false,
  tags: activity.tags ?? []
})

export const mapPostFromRow = (row: SupabasePostRow): Post => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  excerpt: row.excerpt ?? '',
  content: row.content ?? '',
  coverImageUrl: row.cover_image_url ?? '',
  status: row.status,
  publishedAt: row.published_at ?? ''
})

export const mapPostToPayload = (post: Partial<Post>) => ({
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt || null,
  content: post.content || null,
  cover_image_url: post.coverImageUrl || null,
  status: post.status ?? 'draft',
  published_at: post.publishedAt || null
})

export const mapFileFromRow = (row: SupabaseFileRow): FileResource => ({
  id: row.id,
  title: row.title,
  fileUrl: row.file_url,
  fileType: row.file_type ?? '',
  academicYear: row.academic_year ?? undefined,
  activityId: row.activity_id ?? undefined,
  category: row.category ?? '',
  description: row.description ?? '',
  createdAt: row.created_at
})

export const mapFileToPayload = (file: Partial<FileResource>) => ({
  title: file.title,
  file_url: file.fileUrl,
  file_type: file.fileType || null,
  academic_year: file.academicYear ?? null,
  activity_id: file.activityId ?? null,
  category: file.category || null,
  description: file.description || null
})

export const mapFaqFromRow = (row: SupabaseFaqRow): FAQItem => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  sortOrder: row.sort_order ?? 0,
  isVisible: row.is_visible
})

export const mapFaqToPayload = (faq: Partial<FAQItem>) => ({
  question: faq.question,
  answer: faq.answer,
  sort_order: faq.sortOrder ?? 0,
  is_visible: faq.isVisible ?? true
})

const readLocations = (value: unknown): SiteSettings['locations'] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is SiteSettings['locations'][number] => {
      return Boolean(item && typeof item === 'object' && 'title' in item && 'address' in item && 'mapUrl' in item)
    })
  }

  return siteSettings.locations
}

export const mapSettingsFromRow = (row: SupabaseSiteSettingsRow): SiteSettings => ({
  siteName: row.site_name ?? siteSettings.siteName,
  clubNameZh: row.club_name_zh ?? siteSettings.clubNameZh,
  clubNameEn: row.club_name_en ?? siteSettings.clubNameEn,
  slogan: row.slogan ?? siteSettings.slogan,
  facebookUrl: row.facebook_url ?? siteSettings.facebookUrl,
  instagramUrl: row.instagram_url ?? siteSettings.instagramUrl,
  contactText: row.contact_text ?? siteSettings.contactText,
  email: row.email ?? siteSettings.email,
  phone: row.phone ?? siteSettings.phone,
  locations: readLocations(row.map_locations)
})

export const mapSettingsToPayload = (settings: Partial<SiteSettings>) => ({
  site_name: settings.siteName,
  club_name_zh: settings.clubNameZh,
  club_name_en: settings.clubNameEn,
  slogan: settings.slogan,
  facebook_url: settings.facebookUrl,
  instagram_url: settings.instagramUrl,
  contact_text: settings.contactText,
  email: settings.email,
  phone: settings.phone,
  map_locations: settings.locations ?? null
})
