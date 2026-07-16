import type { AdminAccessAuditLog, AdminAccessOverviewResponse, AdminAccount, AdminInvitation, CreateAdminInvitationInput, CreateAdminInvitationResponse } from '~/types/adminAccess'

interface AdminsResponse { admins: AdminAccount[] }
interface InvitationsResponse { invitations: AdminInvitation[] }
interface AuditResponse { auditLogs: AdminAccessAuditLog[] }

export const useAdminAccess = () => {
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  return useAsyncData<AdminAccessOverviewResponse>(
    'admin-access-overview',
    async () => {
      const [admins, invitations, audit] = await Promise.all([
        $fetch<AdminsResponse>('/api/admin/access/admins', { headers: requestHeaders }),
        $fetch<InvitationsResponse>('/api/admin/access/invitations', { headers: requestHeaders }),
        $fetch<AuditResponse>('/api/admin/access/audit', { headers: requestHeaders })
      ])
      return { admins: admins.admins, invitations: invitations.invitations, auditLogs: audit.auditLogs }
    },
    { default: () => ({ admins: [], invitations: [], auditLogs: [] }) }
  )
}

export const useAdminAccessMutations = () => ({
  createInvitation: (input: CreateAdminInvitationInput) =>
    $fetch<CreateAdminInvitationResponse>('/api/admin/access/invitations', { method: 'POST', body: input }),
  revokeInvitation: (id: string) =>
    $fetch(`/api/admin/access/invitations/${id}/revoke`, { method: 'POST' }),
  setAdminActive: (userId: string, isActive: boolean) =>
    $fetch(`/api/admin/access/admins/${userId}`, { method: 'PATCH', body: { isActive } })
})
