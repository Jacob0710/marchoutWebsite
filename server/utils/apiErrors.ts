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
