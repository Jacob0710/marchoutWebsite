import type { ActivityType, ContentStatus } from '~/types/content'

export type ActivityAssetKind = 'image' | 'attachment'

export interface AdminActivityAsset {
  id: string
  kind: ActivityAssetKind
  originalName: string
  mimeType: string
  sizeBytes: number
  altText: string | null
  sortOrder: number
  fileUrl: string
  isCover: boolean
}

export interface AdminActivityVideo {
  id: string
  url: string
  title: string | null
  sortOrder: number
  embedUrl: string | null
}

export interface AdminActivity {
  id: string
  title: string
  slug: string
  academicYear: number
  activityType: ActivityType
  eventDate: string | null
  location: string | null
  participantsCount: number
  resultSummary: string | null
  content: string | null
  status: ContentStatus
  isFeatured: boolean
  tags: string[]
  coverAssetId: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  assets: AdminActivityAsset[]
  videos: AdminActivityVideo[]
}

export interface AdminActivityListRow extends Omit<AdminActivity, 'assets' | 'videos'> {
  assetCount: number
  imageCount: number
  attachmentCount: number
  videoCount: number
}

export interface AdminActivityInput {
  title: string
  slug?: string
  academicYear?: number
  activityType?: ActivityType
  eventDate?: string | null
  location?: string | null
  participantsCount?: number
  resultSummary?: string | null
  content?: string | null
  isFeatured?: boolean
  tags?: string[]
}

export interface ApiErrorResponse {
  statusCode: number
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
}
