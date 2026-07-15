import type { AdminActivityRow } from '~/types/admin'

interface AdminActivitiesResponse {
  activities: AdminActivityRow[]
}

export const useAdminActivities = () => {
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  return useAsyncData(
    'admin-activities',
    async () => {
      const response = await $fetch<AdminActivitiesResponse>('/api/admin/activities', {
        headers: requestHeaders
      })
      return response.activities
    },
    { default: () => [] }
  )
}
