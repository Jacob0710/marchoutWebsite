import type { ContentStatus } from '~/types/content'

export interface ContentStatistic {
  label: string
  value: string
}

export interface MapLocation {
  title: string
  address: string
  mapUrl: string
}

export interface PublicPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverUrl: string | null
  coverAlt: string
  isFeatured: boolean
  publishedAt: string
}

export interface AdminPost extends Omit<PublicPost, 'publishedAt'> {
  status: ContentStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  hasCover: boolean
}

export interface PostInput {
  title: string
  slug: string
  excerpt?: string
  content: string
  coverAlt?: string
  isFeatured?: boolean
}

export interface PublicFileResource {
  id: string
  title: string
  description: string
  academicYear: number | null
  category: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  publishedAt: string
  downloadUrl: string
}

export interface AdminFileResource extends Omit<PublicFileResource, 'publishedAt'> {
  status: ContentStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  sortOrder: number
  hasUpload: boolean
}

export interface FileMetadataInput {
  title: string
  description?: string
  academicYear?: number | null
  category?: string
  sortOrder?: number
}

export interface CoreFaqItem {
  id: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FaqInput {
  question: string
  answer: string
  sortOrder?: number
  isActive?: boolean
}

export interface PublicYearSummary {
  id: string
  academicYear: number
  title: string
  theme: string
  summary: string
  highlights: string[]
  statistics: ContentStatistic[]
  coverUrl: string | null
  coverAlt: string
  reportFile: PublicFileResource | null
  publishedAt: string
}

export interface AdminYearSummary extends Omit<PublicYearSummary, 'publishedAt' | 'reportFile'> {
  status: ContentStatus
  publishedAt: string | null
  reportFileId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  hasCover: boolean
}

export interface YearSummaryInput {
  academicYear: number
  title: string
  theme?: string
  summary: string
  highlights?: string[]
  statistics?: ContentStatistic[]
  coverAlt?: string
  reportFileId?: string | null
  sortOrder?: number
}

export interface CoreSiteSettings {
  id: string
  siteName: string
  clubNameZh: string
  clubNameEn: string
  slogan: string
  heroTitle: string
  heroSubtitle: string
  aboutSummary: string
  logoUrl: string | null
  facebookUrl: string
  instagramUrl: string
  youtubeUrl: string
  contactText: string
  email: string
  phone: string
  locations: MapLocation[]
  defaultSeoTitle: string
  defaultSeoDescription: string
  footerText: string
  updatedAt: string
}

export type SiteSettingsInput = Omit<CoreSiteSettings, 'id' | 'logoUrl' | 'updatedAt'>

export interface PaginatedAdminResponse<T> {
  items: T[]
  total: number
}
