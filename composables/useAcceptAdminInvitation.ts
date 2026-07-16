import { FetchError } from 'ofetch'
import type { AcceptAdminInvitationInput } from '~/types/adminAccess'

export const useAcceptAdminInvitation = () => {
  const isSubmitting = ref(false)
  const error = ref('')

  const accept = async (input: AcceptAdminInvitationInput) => {
    if (isSubmitting.value) return false
    isSubmitting.value = true
    error.value = ''
    try {
      const response = await $fetch<{ success: true; redirectTo: '/admin' }>('/api/auth/admin-invite/accept', {
        method: 'POST',
        body: input
      })
      return response.success
    } catch (caught) {
      error.value = caught instanceof FetchError && caught.statusCode === 401
        ? '帳號或密碼不正確。'
        : '邀請無效、已失效，或帳號資料不相符。'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return { isSubmitting: readonly(isSubmitting), error: readonly(error), accept }
}
