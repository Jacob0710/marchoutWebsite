import type { Activity, FAQItem, FileResource, Post, SiteSettings } from '~/types/content'
import type {
  SupabaseActivityRow,
  SupabaseFaqRow,
  SupabaseFileRow,
  SupabasePostRow,
  SupabaseSiteSettingsRow
} from '~/types/supabase'
import {
  mapActivityFromRow,
  mapActivityToPayload,
  mapFaqFromRow,
  mapFaqToPayload,
  mapFileFromRow,
  mapFileToPayload,
  mapPostFromRow,
  mapPostToPayload,
  mapSettingsFromRow,
  mapSettingsToPayload
} from '~/utils/supabaseMappers'
import { mockActivities, mockFaq, mockFiles, mockPosts, siteSettings } from '~/utils/mockData'

const createMockId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const requireSupabase = () => {
  const client = useSupabaseClient()
  if (!client) {
    throw new Error('Supabase is not configured.')
  }
  return client
}

const throwIfError = (error: { message: string } | null | undefined) => {
  if (error) {
    throw new Error(error.message)
  }
}

export const useAdminRepository = () => {
  const { isSupabaseConfigured } = useSupabaseConfig()
  const mockActivitiesState = useState<Activity[]>('admin-mock-activities', () => [...mockActivities])
  const mockPostsState = useState<Post[]>('admin-mock-posts', () => [...mockPosts])
  const mockFilesState = useState<FileResource[]>('admin-mock-files', () => [...mockFiles])
  const mockFaqState = useState<FAQItem[]>('admin-mock-faq', () => [...mockFaq])
  const mockSettingsState = useState<SiteSettings>('admin-mock-settings', () => ({ ...siteSettings }))

  const listActivities = async () => {
    if (!isSupabaseConfigured) return [...mockActivitiesState.value]

    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('event_date', { ascending: false })

    throwIfError(error)
    return ((data ?? []) as SupabaseActivityRow[]).map((row) => mapActivityFromRow(row))
  }

  const getActivity = async (id: string) => {
    if (!isSupabaseConfigured) return mockActivitiesState.value.find((activity) => activity.id === id) ?? null

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('activities').select('*').eq('id', id).maybeSingle()
    throwIfError(error)
    return data ? mapActivityFromRow(data as SupabaseActivityRow) : null
  }

  const createActivity = async (activity: Partial<Activity>) => {
    if (!isSupabaseConfigured) {
      const created: Activity = {
        id: createMockId('activity'),
        title: activity.title ?? '',
        slug: activity.slug ?? '',
        academicYear: activity.academicYear ?? 114,
        activityType: activity.activityType ?? 'regular',
        eventDate: activity.eventDate ?? '',
        location: activity.location ?? '',
        participantsCount: activity.participantsCount ?? 0,
        resultSummary: activity.resultSummary ?? '',
        content: activity.content ?? '',
        coverImageUrl: activity.coverImageUrl ?? '',
        videoUrl: activity.videoUrl,
        status: activity.status ?? 'draft',
        isFeatured: activity.isFeatured ?? false,
        tags: activity.tags ?? [],
        images: [],
        files: []
      }
      mockActivitiesState.value = [created, ...mockActivitiesState.value]
      return created
    }

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('activities').insert(mapActivityToPayload(activity)).select('*').single()
    throwIfError(error)
    return mapActivityFromRow(data as SupabaseActivityRow)
  }

  const updateActivity = async (id: string, activity: Partial<Activity>) => {
    if (!isSupabaseConfigured) {
      mockActivitiesState.value = mockActivitiesState.value.map((item) =>
        item.id === id ? { ...item, ...activity, id } : item
      )
      return mockActivitiesState.value.find((item) => item.id === id) ?? null
    }

    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('activities')
      .update(mapActivityToPayload(activity))
      .eq('id', id)
      .select('*')
      .single()
    throwIfError(error)
    return mapActivityFromRow(data as SupabaseActivityRow)
  }

  const deleteActivity = async (id: string) => {
    if (!isSupabaseConfigured) {
      mockActivitiesState.value = mockActivitiesState.value.filter((activity) => activity.id !== id)
      return
    }

    const supabase = requireSupabase()
    const { error } = await supabase.from('activities').delete().eq('id', id)
    throwIfError(error)
  }

  const listPosts = async () => {
    if (!isSupabaseConfigured) return [...mockPostsState.value]

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('posts').select('*').order('published_at', { ascending: false })
    throwIfError(error)
    return ((data ?? []) as SupabasePostRow[]).map(mapPostFromRow)
  }

  const getPost = async (id: string) => {
    if (!isSupabaseConfigured) return mockPostsState.value.find((post) => post.id === id) ?? null

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
    throwIfError(error)
    return data ? mapPostFromRow(data as SupabasePostRow) : null
  }

  const createPost = async (post: Partial<Post>) => {
    if (!isSupabaseConfigured) {
      const created: Post = {
        id: createMockId('post'),
        title: post.title ?? '',
        slug: post.slug ?? '',
        excerpt: post.excerpt ?? '',
        content: post.content ?? '',
        coverImageUrl: post.coverImageUrl ?? '',
        status: post.status ?? 'draft',
        publishedAt: post.publishedAt ?? new Date().toISOString()
      }
      mockPostsState.value = [created, ...mockPostsState.value]
      return created
    }

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('posts').insert(mapPostToPayload(post)).select('*').single()
    throwIfError(error)
    return mapPostFromRow(data as SupabasePostRow)
  }

  const updatePost = async (id: string, post: Partial<Post>) => {
    if (!isSupabaseConfigured) {
      mockPostsState.value = mockPostsState.value.map((item) => (item.id === id ? { ...item, ...post, id } : item))
      return mockPostsState.value.find((item) => item.id === id) ?? null
    }

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('posts').update(mapPostToPayload(post)).eq('id', id).select('*').single()
    throwIfError(error)
    return mapPostFromRow(data as SupabasePostRow)
  }

  const deletePost = async (id: string) => {
    if (!isSupabaseConfigured) {
      mockPostsState.value = mockPostsState.value.filter((post) => post.id !== id)
      return
    }

    const supabase = requireSupabase()
    const { error } = await supabase.from('posts').delete().eq('id', id)
    throwIfError(error)
  }

  const listFiles = async () => {
    if (!isSupabaseConfigured) return [...mockFilesState.value]

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('files').select('*').order('created_at', { ascending: false })
    throwIfError(error)
    return ((data ?? []) as SupabaseFileRow[]).map(mapFileFromRow)
  }

  const createFile = async (file: Partial<FileResource>) => {
    if (!isSupabaseConfigured) {
      const created: FileResource = {
        id: createMockId('file'),
        title: file.title ?? '',
        fileUrl: file.fileUrl ?? '#',
        fileType: file.fileType ?? '',
        academicYear: file.academicYear,
        activityId: file.activityId,
        category: file.category ?? '',
        description: file.description ?? '',
        createdAt: new Date().toISOString()
      }
      mockFilesState.value = [created, ...mockFilesState.value]
      return created
    }

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('files').insert(mapFileToPayload(file)).select('*').single()
    throwIfError(error)
    return mapFileFromRow(data as SupabaseFileRow)
  }

  const deleteFile = async (id: string) => {
    if (!isSupabaseConfigured) {
      mockFilesState.value = mockFilesState.value.filter((file) => file.id !== id)
      return
    }

    const supabase = requireSupabase()
    const { error } = await supabase.from('files').delete().eq('id', id)
    throwIfError(error)
  }

  const listFaq = async () => {
    if (!isSupabaseConfigured) return [...mockFaqState.value].sort((a, b) => a.sortOrder - b.sortOrder)

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('faq').select('*').order('sort_order', { ascending: true })
    throwIfError(error)
    return ((data ?? []) as SupabaseFaqRow[]).map(mapFaqFromRow)
  }

  const createFaq = async (faq: Partial<FAQItem>) => {
    if (!isSupabaseConfigured) {
      const created: FAQItem = {
        id: createMockId('faq'),
        question: faq.question ?? '',
        answer: faq.answer ?? '',
        sortOrder: faq.sortOrder ?? mockFaqState.value.length + 1,
        isVisible: faq.isVisible ?? true
      }
      mockFaqState.value = [...mockFaqState.value, created]
      return created
    }

    const supabase = requireSupabase()
    const { data, error } = await supabase.from('faq').insert(mapFaqToPayload(faq)).select('*').single()
    throwIfError(error)
    return mapFaqFromRow(data as SupabaseFaqRow)
  }

  const deleteFaq = async (id: string) => {
    if (!isSupabaseConfigured) {
      mockFaqState.value = mockFaqState.value.filter((faq) => faq.id !== id)
      return
    }

    const supabase = requireSupabase()
    const { error } = await supabase.from('faq').delete().eq('id', id)
    throwIfError(error)
  }

  const getSettings = async () => {
    if (!isSupabaseConfigured) return mockSettingsState.value

    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    throwIfError(error)
    return data ? mapSettingsFromRow(data as SupabaseSiteSettingsRow) : mockSettingsState.value
  }

  const updateSettings = async (settings: Partial<SiteSettings>) => {
    if (!isSupabaseConfigured) {
      mockSettingsState.value = { ...mockSettingsState.value, ...settings }
      return mockSettingsState.value
    }

    const supabase = requireSupabase()
    const { data: existing, error: existingError } = await supabase
      .from('site_settings')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    throwIfError(existingError)

    if (existing?.id) {
      const { data, error } = await supabase
        .from('site_settings')
        .update(mapSettingsToPayload(settings))
        .eq('id', existing.id)
        .select('*')
        .single()
      throwIfError(error)
      return mapSettingsFromRow(data as SupabaseSiteSettingsRow)
    }

    const { data, error } = await supabase.from('site_settings').insert(mapSettingsToPayload(settings)).select('*').single()
    throwIfError(error)
    return mapSettingsFromRow(data as SupabaseSiteSettingsRow)
  }

  const uploadFile = async (bucket: string, path: string, file: File) => {
    if (!isSupabaseConfigured) {
      return URL.createObjectURL(file)
    }

    const supabase = requireSupabase()
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    throwIfError(error)
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  return {
    isSupabaseConfigured,
    listActivities,
    getActivity,
    createActivity,
    updateActivity,
    deleteActivity,
    listPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    listFiles,
    createFile,
    deleteFile,
    listFaq,
    createFaq,
    deleteFaq,
    getSettings,
    updateSettings,
    uploadFile
  }
}
