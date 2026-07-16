export const adminAccessActions = [
  'invitation_created',
  'invitation_revoked',
  'invitation_accepted',
  'admin_activated',
  'admin_deactivated'
] as const

export type AdminAccessAction = typeof adminAccessActions[number]
export type AdminInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface AdminAccount {
  userId: string
  email: string
  isActive: boolean
  grantedAt: string
  deactivatedAt: string | null
  createdAt: string
  updatedAt: string
  lastSignInAt: string | null
  emailConfirmed: boolean
  isCurrent: boolean
}

export interface AdminInvitation {
  id: string
  email: string
  status: AdminInvitationStatus
  expiresAt: string
  invitedByEmail: string
  acceptedByEmail: string | null
  createdAt: string
  acceptedAt: string | null
  revokedAt: string | null
}

export interface AdminAccessAuditLog {
  id: number
  actorUserId: string | null
  actorEmail: string | null
  action: AdminAccessAction
  targetUserId: string | null
  targetEmail: string | null
  invitationId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface CreateAdminInvitationInput {
  email: string
  expiresInDays?: number
}

export interface CreateAdminInvitationResponse {
  invitation: Pick<AdminInvitation, 'id' | 'email' | 'expiresAt'>
  inviteUrl: string
}

export interface UpdateAdminAccessInput {
  isActive: boolean
}

export interface AcceptAdminInvitationInput {
  email: string
  password: string
  token: string
}

export interface AdminAccessOverviewResponse {
  admins: AdminAccount[]
  invitations: AdminInvitation[]
  auditLogs: AdminAccessAuditLog[]
}

export type AdminAccessErrorCode =
  | 'AUTH_REQUIRED'
  | 'ADMIN_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'VALIDATION_ERROR'
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
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
