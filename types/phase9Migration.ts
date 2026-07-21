export type Phase9SourceSystem = 'wix' | 'legacy-db' | 'legacy-storage' | 'mock' | 'repository' | 'external-public'
export type Phase9SourceKind = 'page' | 'activity' | 'post' | 'file' | 'faq' | 'year-summary' | 'site-setting' | 'static-page' | 'image' | 'attachment' | 'video-link' | 'unknown'
export type Phase9Disposition = 'migrate' | 'merge' | 'redirect-only' | 'archive' | 'duplicate' | 'manual-review' | 'skip'
export type Phase9TargetKind = 'activity' | 'post' | 'file' | 'faq' | 'year-summary' | 'site-settings' | 'static-page'

export interface SourceInventoryItem {
  sourceSystem: Phase9SourceSystem
  sourceKind: Phase9SourceKind
  sourceKey: string
  sourceUrl?: string
  parentSourceKey?: string
  title?: string
  discoveredAt: string
  sourceUpdatedAt?: string
  httpStatus?: number
  contentType?: string
  byteSize?: number
  sha256?: string
  language?: string
  disposition: Phase9Disposition
  targetKind?: Phase9TargetKind
  reason?: string
}

export interface ContentMigrationItem {
  migrationKey: string
  sourceKeys: string[]
  targetKind: Phase9TargetKind
  targetNaturalKey: string
  sourceHash: string
  normalizedHash: string
  operation: 'create' | 'update' | 'merge' | 'skip' | 'manual-review'
  desiredStatus: 'draft' | 'published'
  payload: Record<string, unknown>
  assetKeys: string[]
  oldUrls: string[]
  warnings: string[]
  blockingIssues: string[]
}

export interface AssetMigrationItem {
  assetKey: string
  sourceKey: string
  sourceUrl?: string
  sourceSha256?: string
  cacheName?: string
  ownerMigrationKey: string
  ownerKind: 'activity' | 'post' | 'file' | 'year-summary' | 'site-settings'
  role: 'cover' | 'gallery' | 'attachment' | 'download' | 'logo'
  originalFilename?: string
  detectedMimeType?: string
  extension?: string
  byteSize?: number
  sha256?: string
  width?: number
  height?: number
  targetBucket: 'activity-assets' | 'content-assets' | 'downloads'
  targetNamespace: string
  operation: 'upload-private' | 'reuse-existing-owner-object' | 'skip' | 'manual-review'
  warnings: string[]
}
