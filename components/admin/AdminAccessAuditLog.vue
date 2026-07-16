<script setup lang="ts">
import type { AdminAccessAuditLog } from '~/types/adminAccess'
defineProps<{ logs: AdminAccessAuditLog[] }>()
const labels = { invitation_created: '建立邀請', invitation_revoked: '撤銷邀請', invitation_accepted: '接受邀請', admin_activated: '啟用管理員', admin_deactivated: '停用管理員' }
const format = (value: string) => new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
</script>

<template>
  <AdminDataTable title="存取權稽核" description="唯讀、append-only；顯示最近 50 筆">
    <thead class="bg-cloud text-left text-xs font-bold text-muted"><tr><th class="px-4 py-3">時間</th><th class="px-4 py-3">操作</th><th class="px-4 py-3">執行者</th><th class="px-4 py-3">目標</th></tr></thead>
    <tbody class="divide-y divide-slate-200">
      <tr v-for="log in logs" :key="log.id"><td class="px-4 py-4 text-sm text-muted">{{ format(log.createdAt) }}</td><td class="px-4 py-4 font-bold text-ink">{{ labels[log.action] }}</td><td class="px-4 py-4 text-sm text-muted">{{ log.actorEmail ?? '系統' }}</td><td class="px-4 py-4 text-sm text-muted">{{ log.targetEmail ?? '—' }}</td></tr>
    </tbody>
  </AdminDataTable>
</template>
