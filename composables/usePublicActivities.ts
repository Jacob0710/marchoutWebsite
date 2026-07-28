import type { Ref } from 'vue'
import type { Activity } from '~/types/content'
import type { SupabaseActivityAssetRow, SupabaseActivityImageRow, SupabaseActivityRow, SupabaseActivityVideoRow } from '~/types/supabase'
import { mockActivities } from '~/utils/mockData'
import { mapActivityFromRow, mapActivityImageFromRow, mapPublicAssetFile, mapPublicAssetImage, mapPublicVideo } from '~/utils/supabaseMappers'

const publicActivityColumns =
  'id,title,slug,academic_year,activity_type,event_date,location,participants_count,result_summary,content,cover_image_url,video_url,status,is_featured,tags,cover_asset_id' as const

const publicActivityImageColumns = 'id,activity_id,image_url,caption,sort_order'
const publicVideoColumns = 'id,activity_id,url,title,sort_order'
const publicAssetColumns = 'id,activity_id,kind,original_name,mime_type,size_bytes,alt_text,sort_order'
const publicFileTitleColumns = 'title'
const phase10Unavailable = (error: { code?: string; message?: string } | null) => error?.code === 'PGRST202' && /phase10_/i.test(error.message ?? '')
const mockPublishedActivities = () => mockActivities.filter((activity) => activity.status === 'published')
const publicActivityQueryError = () => new Error('Public activity data is temporarily unavailable.')

export const usePublicActivities = () => {
  const { isSupabaseConfigured } = useSupabaseConfig()

  return useAsyncData<Activity[]>(
    'public-published-activities',
    async () => {
      if (!isSupabaseConfigured) return mockPublishedActivities()

      const supabase = useSupabaseClient()
      if (!supabase) throw publicActivityQueryError()

      const { data, error } = await supabase
        .from('activities')
        .select(publicActivityColumns)
        .eq('status', 'published')
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('id', { ascending: true })

      if (error) throw publicActivityQueryError()
      return ((data ?? []) as SupabaseActivityRow[]).map((row) => mapActivityFromRow(row))
    },
    { default: () => (isSupabaseConfigured ? [] : mockPublishedActivities()) }
  )
}

export const usePublicActivityBySlug = (slug: Ref<string>) => {
  const { isSupabaseConfigured } = useSupabaseConfig()

  return useAsyncData<Activity[]>(
    'public-activity-detail',
    async () => {
      if (!isSupabaseConfigured) {
        return mockPublishedActivities().filter((activity) => activity.slug === slug.value)
      }

      const supabase = useSupabaseClient()
      if (!supabase) throw publicActivityQueryError()

      const { data: activityRow, error: activityError } = await supabase
        .from('activities')
        .select(publicActivityColumns)
        .eq('slug', slug.value)
        .eq('status', 'published')
        .maybeSingle()

      if (activityError) throw publicActivityQueryError()
      if (!activityRow) return []

      const activity = activityRow as SupabaseActivityRow
      const loadAssets = async () => {
        const response = await supabase.rpc('phase10_public_activity_assets', { p_activity_id: activity.id })
        return phase10Unavailable(response.error)
          ? supabase.from('activity_assets').select(publicAssetColumns).eq('activity_id', activity.id).order('sort_order').order('id')
          : response
      }
      const loadFileTitles = async () => {
        const response = await supabase.rpc('phase10_public_activity_file_titles', { p_activity_id: activity.id })
        return phase10Unavailable(response.error)
          ? supabase.from('files').select(publicFileTitleColumns).eq('activity_id', activity.id).order('created_at', { ascending: false }).order('id')
          : response
      }
      const [assetsResponse, videosResponse, imagesResponse, filesResponse] = await Promise.all([
        loadAssets(),
        supabase
          .from('activity_videos')
          .select(publicVideoColumns)
          .eq('activity_id', activity.id)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('activity_images')
          .select(publicActivityImageColumns)
          .eq('activity_id', activity.id)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true }),
        loadFileTitles()
      ])

      if (assetsResponse.error || videosResponse.error || imagesResponse.error || filesResponse.error) throw publicActivityQueryError()

      const assets = (assetsResponse.data ?? []) as unknown as SupabaseActivityAssetRow[]
      const newImages = assets.filter((asset) => asset.kind === 'image').map(mapPublicAssetImage)
      const attachments = assets.filter((asset) => asset.kind === 'attachment').map(mapPublicAssetFile)

      return [
        mapActivityFromRow(
          activity,
          [...newImages, ...((imagesResponse.data ?? []) as SupabaseActivityImageRow[]).map(mapActivityImageFromRow)],
          [...attachments, ...(filesResponse.data ?? []).map((file: { title: string }) => file.title)],
          ((videosResponse.data ?? []) as unknown as SupabaseActivityVideoRow[]).map(mapPublicVideo)
        )
      ]
    },
    {
      default: () => [],
      watch: [slug]
    }
  )
}
