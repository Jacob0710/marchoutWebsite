export type ContentStatus = 'draft' | 'published'

export type ActivityType = 'regular' | 'project' | 'exploration'

export interface ActivityImage {
  id: string
  imageUrl: string
  caption: string
  sortOrder: number
}

export interface Activity {
  id: string
  title: string
  slug: string
  academicYear: number
  activityType: ActivityType
  eventDate: string
  location: string
  participantsCount: number
  resultSummary: string
  content: string
  coverImageUrl: string
  videoUrl?: string
  status: ContentStatus
  isFeatured: boolean
  tags: string[]
  images: ActivityImage[]
  files: string[]
}

export interface Program {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  imageUrl: string
  highlights: string[]
}

export interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImageUrl: string
  status: ContentStatus
  publishedAt: string
}

export interface FileResource {
  id: string
  title: string
  fileUrl: string
  fileType: string
  academicYear?: number
  activityId?: string
  category: string
  description: string
  createdAt: string
}

export interface FAQItem {
  id: string
  question: string
  answer: string
  sortOrder: number
  isVisible: boolean
}

export interface YearSummary {
  year: number
  theme: string
  summary: string
  coverImageUrl: string
  reportUrl: string
  highlights: string[]
}

export interface SiteSettings {
  siteName: string
  clubNameZh: string
  clubNameEn: string
  slogan: string
  facebookUrl: string
  instagramUrl: string
  contactText: string
  email: string
  phone: string
  locations: Array<{
    title: string
    address: string
    mapUrl: string
  }>
}
