import type { ActivityType, ContentStatus } from '~/types/content'

export interface SupabaseActivityRow {
  id: string
  title: string
  slug: string
  academic_year: number
  activity_type: ActivityType
  event_date: string | null
  location: string | null
  participants_count: number | null
  result_summary: string | null
  content: string | null
  cover_image_url: string | null
  video_url: string | null
  status: ContentStatus
  is_featured: boolean
  tags: string[] | null
  created_at?: string
  updated_at?: string
}

export interface SupabaseActivityImageRow {
  id: string
  activity_id: string
  image_url: string
  caption: string | null
  sort_order: number | null
}

export interface SupabasePostRow {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image_url: string | null
  status: ContentStatus
  published_at: string | null
}

export interface SupabaseFileRow {
  id: string
  title: string
  file_url: string
  file_type: string | null
  academic_year: number | null
  activity_id: string | null
  category: string | null
  description: string | null
  created_at: string
}

export interface SupabaseFaqRow {
  id: string
  question: string
  answer: string
  sort_order: number | null
  is_visible: boolean
}

export interface SupabaseSiteSettingsRow {
  id: string
  site_name: string | null
  club_name_zh: string | null
  club_name_en: string | null
  slogan: string | null
  logo_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  contact_text: string | null
  email: string | null
  phone: string | null
  map_locations: unknown
}
