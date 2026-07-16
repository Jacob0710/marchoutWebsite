import type { AdminAccessAuditLog, AdminAccount, AdminInvitation } from '~/types/adminAccess'

type RpcRow = Record<string, unknown>

const text = (value: unknown) => typeof value === 'string' ? value : ''
const optionalText = (value: unknown) => typeof value === 'string' ? value : null

export const mapAdminAccount = (row: RpcRow): AdminAccount => ({
  userId: text(row.admin_user_id),
  email: text(row.admin_email),
  isActive: row.admin_is_active === true,
  grantedAt: text(row.admin_granted_at),
  deactivatedAt: optionalText(row.admin_deactivated_at),
  createdAt: text(row.admin_created_at),
  updatedAt: text(row.admin_updated_at),
  lastSignInAt: optionalText(row.admin_last_sign_in_at),
  emailConfirmed: row.admin_email_confirmed === true,
  isCurrent: row.admin_is_current === true
})

export const mapAdminInvitation = (row: RpcRow): AdminInvitation => ({
  id: text(row.invitation_id),
  email: text(row.invitation_email),
  status: text(row.invitation_status) as AdminInvitation['status'],
  expiresAt: text(row.invitation_expires_at),
  invitedByEmail: text(row.invitation_invited_by_email),
  acceptedByEmail: optionalText(row.invitation_accepted_by_email),
  createdAt: text(row.invitation_created_at),
  acceptedAt: optionalText(row.invitation_accepted_at),
  revokedAt: optionalText(row.invitation_revoked_at)
})

export const mapAdminAccessAuditLog = (row: RpcRow): AdminAccessAuditLog => ({
  id: Number(row.audit_id),
  actorUserId: optionalText(row.audit_actor_user_id),
  actorEmail: optionalText(row.audit_actor_email),
  action: text(row.audit_action) as AdminAccessAuditLog['action'],
  targetUserId: optionalText(row.audit_target_user_id),
  targetEmail: optionalText(row.audit_target_email),
  invitationId: optionalText(row.audit_invitation_id),
  metadata: row.audit_metadata && typeof row.audit_metadata === 'object' && !Array.isArray(row.audit_metadata)
    ? row.audit_metadata as Record<string, unknown>
    : {},
  createdAt: text(row.audit_created_at)
})
