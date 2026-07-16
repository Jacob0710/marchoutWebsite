import { FetchError } from 'ofetch'
import type {
  AdminAuthStatus,
  AdminLoginResult,
  AdminUserSummary
} from '~/types/admin'

interface LoginCredentials {
  email: string
  password: string
}

interface SessionResponse {
  user: AdminUserSummary
}

const getFetchStatusCode = (error: unknown) =>
  error instanceof FetchError && typeof error.statusCode === 'number' ? error.statusCode : 500

export const useAdminAuth = () => {
  const user = useState<AdminUserSummary | null>('admin-auth-user', () => null)
  const status = useState<AdminAuthStatus>('admin-auth-status', () => 'unknown')
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  const loadAdmin = async () => {
    status.value = 'pending'
    try {
      const response = await $fetch<SessionResponse>('/api/admin/session', { headers: requestHeaders })
      user.value = response.user
      status.value = 'admin'
      return true
    } catch (error) {
      user.value = null
      const statusCode = getFetchStatusCode(error)
      status.value = statusCode === 401 ? 'unauthenticated' : statusCode === 403 ? 'forbidden' : 'error'
      return false
    }
  }

  const login = async (credentials: LoginCredentials): Promise<AdminLoginResult> => {
    status.value = 'pending'
    try {
      const response = await $fetch<SessionResponse>('/api/admin/login', {
        method: 'POST',
        body: credentials
      })
      user.value = response.user
      status.value = 'admin'
      return { ok: true, user: response.user }
    } catch (error) {
      user.value = null
      const statusCode = getFetchStatusCode(error)
      if (statusCode === 403) {
        status.value = 'forbidden'
        return { ok: false, reason: 'forbidden' }
      }
      if (statusCode === 400 || statusCode === 401) {
        status.value = 'unauthenticated'
        return { ok: false, reason: 'invalid-credentials' }
      }
      status.value = 'error'
      return { ok: false, reason: 'unavailable' }
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/admin/logout', { method: 'POST' })
      user.value = null
      status.value = 'unauthenticated'
      await navigateTo('/admin/login')
      clearNuxtData((key) => key === 'admin-activities' || key.startsWith('admin-activity-'))
      return true
    } catch {
      return false
    }
  }

  return {
    user: readonly(user),
    status: readonly(status),
    loadAdmin,
    login,
    logout
  }
}
