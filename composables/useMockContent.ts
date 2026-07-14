import type { Activity, FAQItem, FileResource, Post, SiteSettings } from '~/types/content'
import {
  mockActivities,
  mockFaq,
  mockFiles,
  mockPosts,
  mockPrograms,
  mockYearSummaries,
  siteSettings
} from '~/utils/mockData'

const replaceArray = <T>(target: T[], source: T[]) => {
  target.splice(0, target.length, ...source)
}

export const useMockContent = () => {
  const repository = useAdminRepository()
  const isLoadedFromSupabase = useState('public-content-loaded-from-supabase', () => false)
  const activitiesState = useState<Activity[]>('public-content-activities', () =>
    mockActivities.filter((activity) => activity.status === 'published')
  )
  const featuredActivitiesState = useState<Activity[]>('public-content-featured-activities', () =>
    mockActivities.filter((activity) => activity.status === 'published' && activity.isFeatured)
  )
  const filesState = useState<FileResource[]>('public-content-files', () => [...mockFiles])
  const postsState = useState<Post[]>('public-content-posts', () =>
    mockPosts.filter((post) => post.status === 'published')
  )
  const faqState = useState<FAQItem[]>('public-content-faq', () =>
    mockFaq.filter((item) => item.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)
  )
  const settingsState = useState<SiteSettings>('public-content-settings', () => ({ ...siteSettings }))

  const loadSupabaseContent = async () => {
    if (!repository.isSupabaseConfigured || isLoadedFromSupabase.value) return

    try {
      const [activities, posts, files, faq, settings] = await Promise.all([
        repository.listActivities(),
        repository.listPosts(),
        repository.listFiles(),
        repository.listFaq(),
        repository.getSettings()
      ])
      const publishedActivities = activities.filter((activity) => activity.status === 'published')
      const publishedPosts = posts.filter((post) => post.status === 'published')
      const visibleFaq = faq.filter((item) => item.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)

      replaceArray(activitiesState.value, publishedActivities)
      replaceArray(
        featuredActivitiesState.value,
        publishedActivities.filter((activity) => activity.isFeatured)
      )
      replaceArray(filesState.value, files)
      replaceArray(postsState.value, publishedPosts)
      replaceArray(faqState.value, visibleFaq)
      Object.assign(settingsState.value, settings)
      isLoadedFromSupabase.value = true
    } catch {
      isLoadedFromSupabase.value = false
    }
  }

  if (import.meta.client) {
    onMounted(() => {
      void loadSupabaseContent()
    })
  }

  const activities = activitiesState.value
  const featuredActivities = featuredActivitiesState.value
  const files = filesState.value
  const posts = postsState.value
  const faq = faqState.value
  const settings = settingsState.value

  return {
    activities,
    featuredActivities,
    files,
    posts,
    programs: mockPrograms,
    faq,
    years: mockYearSummaries,
    settings,
    getActivityBySlug: (slug: string) => activities.find((activity) => activity.slug === slug),
    getPostBySlug: (slug: string) => posts.find((post) => post.slug === slug),
    getYear: (year: number) => mockYearSummaries.find((summary) => summary.year === year)
  }
}
