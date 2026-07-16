import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminActivity, AdminActivityAsset, AdminActivityListRow, AdminActivityVideo } from '~/types/adminActivity'
import type { SupabaseActivityAssetRow, SupabaseActivityRow, SupabaseActivityVideoRow } from '~/types/supabase'
import { toSafeVideoEmbedUrl } from '~/shared/activityRules'

interface AdminActivityDatabaseRow extends SupabaseActivityRow {
  created_at: string
  updated_at: string
  assets?: SupabaseActivityAssetRow[]
  videos?: SupabaseActivityVideoRow[]
}

export const adminActivitySelect = `
  id,title,slug,academic_year,activity_type,event_date,location,participants_count,
  result_summary,content,status,is_featured,tags,cover_asset_id,created_at,updated_at,published_at,
  assets:activity_assets!activity_assets_activity_id_fkey(
    id,activity_id,kind,storage_bucket,storage_path,original_name,mime_type,size_bytes,alt_text,sort_order,created_at,updated_at
  ),
  videos:activity_videos(id,activity_id,url,title,sort_order,created_at,updated_at)
` as const

export const requireUuid = (value: string | undefined, label = 'resource') => {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw apiError(404, 'NOT_FOUND', `${label} not found.`)
  }
  return value
}

const mapAsset = (asset: SupabaseActivityAssetRow, coverAssetId: string | null): AdminActivityAsset => ({
  id: asset.id,
  kind: asset.kind,
  originalName: asset.original_name,
  mimeType: asset.mime_type,
  sizeBytes: Number(asset.size_bytes),
  altText: asset.alt_text,
  sortOrder: asset.sort_order,
  fileUrl: `/api/admin/activity-assets/${asset.id}/file`,
  isCover: coverAssetId === asset.id
})

const mapVideo = (video: SupabaseActivityVideoRow): AdminActivityVideo => ({
  id: video.id,
  url: video.url,
  title: video.title,
  sortOrder: video.sort_order,
  embedUrl: toSafeVideoEmbedUrl(video.url)
})

export const mapAdminActivity = (row: AdminActivityDatabaseRow): AdminActivity => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  academicYear: row.academic_year,
  activityType: row.activity_type,
  eventDate: row.event_date,
  location: row.location,
  participantsCount: row.participants_count ?? 0,
  resultSummary: row.result_summary,
  content: row.content,
  status: row.status,
  isFeatured: row.is_featured,
  tags: row.tags ?? [],
  coverAssetId: row.cover_asset_id ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  publishedAt: row.published_at ?? null,
  assets: (row.assets ?? []).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)).map((asset) => mapAsset(asset, row.cover_asset_id ?? null)),
  videos: (row.videos ?? []).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)).map(mapVideo)
})

export const mapAdminActivityListRow = (row: AdminActivityDatabaseRow): AdminActivityListRow => {
  const activity = mapAdminActivity(row)
  const { assets, videos, ...base } = activity
  return {
    ...base,
    assetCount: assets.length,
    imageCount: assets.filter((asset) => asset.kind === 'image').length,
    attachmentCount: assets.filter((asset) => asset.kind === 'attachment').length,
    videoCount: videos.length
  }
}

export const getAdminActivity = async (supabase: SupabaseClient, id: string) => {
  const { data, error } = await supabase
    .from('activities')
    .select(adminActivitySelect)
    .eq('id', id)
    .maybeSingle()
  if (error) throw internalApiError()
  if (!data) throw apiError(404, 'NOT_FOUND', 'Activity not found.')
  return mapAdminActivity(data as unknown as AdminActivityDatabaseRow)
}

export const toActivityDatabasePatch = (values: Record<string, unknown>) => {
  const map: Record<string, string> = {
    title: 'title', slug: 'slug', academicYear: 'academic_year', activityType: 'activity_type',
    eventDate: 'event_date', location: 'location', participantsCount: 'participants_count',
    resultSummary: 'result_summary', content: 'content', isFeatured: 'is_featured', tags: 'tags'
  }
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [map[key], value]).filter(([key]) => Boolean(key)))
}
