import type { AdminAccessErrorCode } from '~/types/adminAccess'

const definitions: Partial<Record<AdminAccessErrorCode, { status: number; message: string }>> = {
  AUTH_REQUIRED: { status: 401, message: 'Authentication required.' },
  ADMIN_REQUIRED: { status: 403, message: 'Administrator access required.' },
  VALIDATION_ERROR: { status: 400, message: 'Invalid request.' },
  INVITATION_NOT_FOUND: { status: 404, message: 'Invitation not found.' },
  INVITATION_CONFLICT: { status: 409, message: 'A pending invitation already exists.' },
  INVITATION_EXPIRED: { status: 410, message: 'Invitation expired.' },
  INVITATION_REVOKED: { status: 409, message: 'Invitation revoked.' },
  INVITATION_ALREADY_USED: { status: 409, message: 'Invitation already used.' },
  INVITATION_EMAIL_MISMATCH: { status: 409, message: 'Invitation account mismatch.' },
  ADMIN_ALREADY_ACTIVE: { status: 409, message: 'Administrator is already active.' },
  ADMIN_INACTIVE: { status: 409, message: 'Administrator is inactive; reactivate the existing account.' },
  ADMIN_NOT_FOUND: { status: 404, message: 'Administrator not found.' },
  SELF_DEACTIVATION_FORBIDDEN: { status: 409, message: 'You cannot deactivate your own access.' },
  LAST_ACTIVE_ADMIN: { status: 409, message: 'At least one active administrator is required.' },
  CONFLICT: { status: 409, message: 'The request conflicts with the current state.' }
}

const getRpcMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') return ''
  const message = Reflect.get(error, 'message')
  return typeof message === 'string' ? message : ''
}

export const throwAdminAccessRpcError = (error: unknown): never => {
  const code = getRpcMessage(error) as AdminAccessErrorCode
  const definition = definitions[code]
  if (definition) throw apiError(definition.status, code, definition.message)
  throw internalApiError()
}
