import { createError } from 'h3'
import type { ApiErrorResponse } from '~/types/adminActivity'

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'ADMIN_REQUIRED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SLUG_CONFLICT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'STORAGE_ERROR'
  | 'CONFLICT'
  | 'INVALID_CREDENTIALS'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_CONFLICT'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_ALREADY_USED'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'ADMIN_ALREADY_ACTIVE'
  | 'ADMIN_INACTIVE'
  | 'ADMIN_NOT_FOUND'
  | 'SELF_DEACTIVATION_FORBIDDEN'
  | 'LAST_ACTIVE_ADMIN'
  | 'INTERNAL_ERROR'

export const apiError = (
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>
) => createError({
  statusCode,
  statusMessage: message,
  data: { statusCode, code, message, ...(fieldErrors ? { fieldErrors } : {}) } satisfies ApiErrorResponse
})

export const isUniqueViolation = (error: unknown) => Boolean(
  error && typeof error === 'object' && Reflect.get(error, 'code') === '23505'
)

export const internalApiError = () => apiError(500, 'INTERNAL_ERROR', 'The request could not be completed.')
