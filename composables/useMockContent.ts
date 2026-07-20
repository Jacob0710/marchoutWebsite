import { mockActivities, mockFaq, mockFiles, mockPosts, mockPrograms, mockYearSummaries, siteSettings } from '~/utils/mockData'

// Explicitly mock-only. Formal Supabase reads use useCoreContent.ts and all
// formal admin writes use Nitro APIs through useCoreContentAdmin.ts.
export const useMockContent = () => ({
  activities: mockActivities.filter((item) => item.status === 'published'),
  featuredActivities: mockActivities.filter((item) => item.status === 'published' && item.isFeatured),
  files: mockFiles,
  posts: mockPosts.filter((item) => item.status === 'published'),
  programs: mockPrograms,
  faq: mockFaq.filter((item) => item.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
  years: mockYearSummaries,
  settings: siteSettings,
  getActivityBySlug: (slug: string) => mockActivities.find((item) => item.status === 'published' && item.slug === slug),
  getPostBySlug: (slug: string) => mockPosts.find((item) => item.status === 'published' && item.slug === slug),
  getYear: (year: number) => mockYearSummaries.find((item) => item.year === year)
})
