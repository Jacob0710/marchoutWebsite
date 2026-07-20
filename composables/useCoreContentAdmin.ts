import type { AdminFileResource, AdminPost, AdminYearSummary, CoreFaqItem, CoreSiteSettings, FaqInput, FileMetadataInput, PaginatedAdminResponse, PostInput, SiteSettingsInput, YearSummaryInput } from '~/types/coreContent'

const errorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') return '操作失敗，請稍後再試。'
  const data = Reflect.get(error, 'data')
  if (data && typeof data === 'object') {
    const nested = Reflect.get(data, 'data')
    const message = nested && typeof nested === 'object' ? Reflect.get(nested, 'message') : Reflect.get(data, 'message')
    if (typeof message === 'string') return message
  }
  return '操作失敗，請稍後再試。'
}
export const useCoreContentAdmin = () => {
  const listPosts = (status = 'all', search = '') => $fetch<PaginatedAdminResponse<AdminPost>>('/api/admin/posts', { query: { status, search } })
  const getPost = (id: string) => $fetch<{ item: AdminPost }>(`/api/admin/posts/${id}`)
  const createPost = (input: PostInput) => $fetch<{ item: AdminPost }>('/api/admin/posts', { method: 'POST', body: input })
  const updatePost = (id: string, input: Partial<PostInput>) => $fetch<{ item: AdminPost }>(`/api/admin/posts/${id}`, { method: 'PATCH', body: input })

  const listFiles = (status = 'all', search = '') => $fetch<PaginatedAdminResponse<AdminFileResource>>('/api/admin/files', { query: { status, search } })
  const createFile = (input: FileMetadataInput) => $fetch<{ item: AdminFileResource }>('/api/admin/files', { method: 'POST', body: input })
  const updateFile = (id: string, input: Partial<FileMetadataInput>) => $fetch<{ item: AdminFileResource }>(`/api/admin/files/${id}`, { method: 'PATCH', body: input })

  const listFaq = () => $fetch<{ items: CoreFaqItem[] }>('/api/admin/faq')
  const createFaq = (input: FaqInput) => $fetch<{ item: CoreFaqItem }>('/api/admin/faq', { method: 'POST', body: input })
  const updateFaq = (id: string, input: Partial<FaqInput>) => $fetch<{ item: CoreFaqItem }>(`/api/admin/faq/${id}`, { method: 'PATCH', body: input })
  const reorderFaq = (ids: string[]) => $fetch<{ items: CoreFaqItem[] }>('/api/admin/faq/reorder', { method: 'POST', body: { ids } })

  const listYears = (status = 'all') => $fetch<PaginatedAdminResponse<AdminYearSummary>>('/api/admin/years', { query: { status } })
  const createYear = (input: YearSummaryInput) => $fetch<{ item: AdminYearSummary }>('/api/admin/years', { method: 'POST', body: input })
  const updateYear = (id: string, input: Partial<YearSummaryInput>) => $fetch<{ item: AdminYearSummary }>(`/api/admin/years/${id}`, { method: 'PATCH', body: input })

  const getSettings = () => $fetch<{ item: CoreSiteSettings }>('/api/admin/settings')
  const updateSettings = (input: Partial<SiteSettingsInput>) => $fetch<{ item: CoreSiteSettings }>('/api/admin/settings', { method: 'PATCH', body: input })

  const mutate = <T>(path: string, method: 'POST' | 'DELETE' = 'POST') => $fetch<T>(path, { method })
  const upload = <T>(path: string, body: FormData) => $fetch<T>(path, { method: 'POST', body })

  return {
    errorMessage, listPosts, getPost, createPost, updatePost,
    listFiles, createFile, updateFile, listFaq, createFaq, updateFaq, reorderFaq,
    listYears, createYear, updateYear, getSettings, updateSettings, mutate, upload
  }
}
