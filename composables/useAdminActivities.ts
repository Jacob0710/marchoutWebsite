import { FetchError } from 'ofetch'
import type { AdminActivity, AdminActivityInput, AdminActivityListRow } from '~/types/adminActivity'

interface ActivityResponse { activity: AdminActivity }
interface ActivitiesResponse { activities: AdminActivityListRow[] }

export const getAdminApiMessage = (error: unknown, fallback = '操作失敗，請稍後再試。') => {
  if (!(error instanceof FetchError)) return fallback
  return error.data?.data?.message || error.data?.message || error.statusMessage || fallback
}

export const getAdminApiFieldErrors = (error: unknown): Record<string, string[]> => {
  if (!(error instanceof FetchError)) return {}
  return error.data?.data?.fieldErrors || error.data?.fieldErrors || {}
}

export const useAdminActivities = (filters?: {
  status: Ref<string>
  category: Ref<string>
  year: Ref<string>
  q: Ref<string>
}) => {
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const query = computed(() => filters ? {
    status: filters.status.value,
    category: filters.category.value || undefined,
    year: filters.year.value || undefined,
    q: filters.q.value || undefined
  } : undefined)

  return useAsyncData(
    'admin-activities',
    async () => (await $fetch<ActivitiesResponse>('/api/admin/activities', { headers: requestHeaders, query: query.value })).activities,
    { default: () => [], watch: filters ? [query] : [] }
  )
}

export const useAdminActivity = (id: Ref<string>) => {
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  return useAsyncData(
    `admin-activity-${id.value}`,
    async () => (await $fetch<ActivityResponse>(`/api/admin/activities/${id.value}`, { headers: requestHeaders })).activity,
    { watch: [id] }
  )
}

export const useAdminActivityMutations = () => ({
  create: (payload: AdminActivityInput) => $fetch<ActivityResponse>('/api/admin/activities', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<AdminActivityInput>) => $fetch<ActivityResponse>(`/api/admin/activities/${id}`, { method: 'PATCH', body: payload }),
  publish: (id: string) => $fetch<ActivityResponse>(`/api/admin/activities/${id}/publish`, { method: 'POST' }),
  unpublish: (id: string) => $fetch<ActivityResponse>(`/api/admin/activities/${id}/unpublish`, { method: 'POST' }),
  remove: (id: string) => $fetch<{ deleted: boolean }>(`/api/admin/activities/${id}`, { method: 'DELETE' })
})
