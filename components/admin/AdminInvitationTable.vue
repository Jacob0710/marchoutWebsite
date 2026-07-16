<script setup lang="ts">
import { Ban, Loader2 } from 'lucide-vue-next'
import type { AdminInvitation } from '~/types/adminAccess'

defineProps<{ invitations: AdminInvitation[]; busyInvitationId?: string }>()
const emit = defineEmits<{ revoke: [invitation: AdminInvitation] }>()
const labels = { pending: '待接受', accepted: '已接受', revoked: '已撤銷', expired: '已過期' }
const colors = { pending: 'bg-honey/20 text-amber-800', accepted: 'bg-teal/10 text-teal', revoked: 'bg-slate-100 text-slate-600', expired: 'bg-red-50 text-red-700' }
const format = (value: string | null) => value ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
</script>

<template>
  <AdminDataTable title="管理員邀請" :description="`共 ${invitations.length} 筆；邀請 token 不會再次顯示`">
    <thead class="bg-cloud text-left text-xs font-bold text-muted"><tr><th class="px-4 py-3">Email</th><th class="px-4 py-3">狀態</th><th class="px-4 py-3">建立／到期</th><th class="px-4 py-3">邀請者</th><th class="px-4 py-3">操作</th></tr></thead>
    <tbody class="divide-y divide-slate-200">
      <tr v-for="invitation in invitations" :key="invitation.id">
        <td class="px-4 py-4 font-bold text-ink">{{ invitation.email }}</td>
        <td class="px-4 py-4"><span class="rounded-md px-2.5 py-1 text-xs font-bold" :class="colors[invitation.status]">{{ labels[invitation.status] }}</span></td>
        <td class="px-4 py-4 text-sm text-muted"><p>{{ format(invitation.createdAt) }}</p><p class="mt-1">到期：{{ format(invitation.expiresAt) }}</p></td>
        <td class="px-4 py-4 text-sm text-muted">{{ invitation.invitedByEmail }}</td>
        <td class="px-4 py-4"><button v-if="invitation.status === 'pending'" type="button" class="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50" :disabled="busyInvitationId === invitation.id" @click="emit('revoke', invitation)"><Loader2 v-if="busyInvitationId === invitation.id" class="size-4 animate-spin" /><Ban v-else class="size-4" />撤銷</button><span v-else class="text-xs text-muted">無可用操作</span></td>
      </tr>
    </tbody>
  </AdminDataTable>
</template>
