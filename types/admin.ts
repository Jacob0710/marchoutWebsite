import type { ContentStatus } from '~/types/content'

export interface AdminUserSummary {
  email: string
}

export interface AdminActivityRow {
  id: string
  title: string
  slug: string
  status: ContentStatus
  eventDate: string | null
  createdAt: string
  updatedAt: string
}

export type AdminAuthStatus =
  | 'unknown'
  | 'pending'
  | 'unauthenticated'
  | 'forbidden'
  | 'admin'
  | 'error'

export type AdminLoginFailure = 'invalid-credentials' | 'forbidden' | 'unavailable'

export type AdminLoginResult =
  | { ok: true; user: AdminUserSummary }
  | { ok: false; reason: AdminLoginFailure }
