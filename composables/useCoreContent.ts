import type { CoreFaqItem, CoreSiteSettings, PublicFileResource, PublicPost, PublicYearSummary } from '~/types/coreContent'

export const usePublicPosts = () => useFetch<{ items: PublicPost[] }>('/api/public/posts', {
  key: 'phase8-public-posts', default: () => ({ items: [] })
})
export const usePublicPost = (slug: Ref<string>) => useFetch<{ item: PublicPost }>(
  () => `/api/public/posts/${encodeURIComponent(slug.value)}`,
  { key: `phase8-public-post-${slug.value}`, watch: [slug] }
)

export const usePublicFiles = () => useFetch<{ items: PublicFileResource[] }>('/api/public/files', {
  key: 'phase8-public-files', default: () => ({ items: [] })
})

export const usePublicFaq = () => useFetch<{ items: CoreFaqItem[] }>('/api/public/faq', {
  key: 'phase8-public-faq', default: () => ({ items: [] })
})

export const usePublicYears = () => useFetch<{ items: PublicYearSummary[] }>('/api/public/years', {
  key: 'phase8-public-years', default: () => ({ items: [] })
})

export const usePublicYear = (year: Ref<number>) => useFetch<{ item: PublicYearSummary }>(
  () => `/api/public/years/${year.value}`,
  { key: `phase8-public-year-${year.value}`, watch: [year] }
)

export const usePublicSettings = () => useFetch<{ item: CoreSiteSettings }>('/api/public/settings', {
  key: 'phase8-public-settings'
})
