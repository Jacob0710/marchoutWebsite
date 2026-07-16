<script setup lang="ts">
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-vue-next'
import type { AdminAccount } from '~/types/adminAccess'

defineProps<{ admins: AdminAccount[]; busyUserId?: string }>()
const emit = defineEmits<{ setActive: [admin: AdminAccount, isActive: boolean] }>()
const format = (value: string | null) => value
  ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'
</script>

<template>
  <AdminDataTable title="管理員" :description="`共 ${admins.length} 位`">
    <thead class="bg-cloud text-left text-xs font-bold text-muted">
      <tr><th class="px-4 py-3">帳號</th><th class="px-4 py-3">狀態</th><th class="px-4 py-3">授權／停用時間</th><th class="px-4 py-3">最後登入</th><th class="px-4 py-3">操作</th></tr>
    </thead>
    <tbody class="divide-y divide-slate-200">
      <tr v-for="admin in admins" :key="admin.userId">
        <td class="px-4 py-4"><p class="font-bold text-ink">{{ admin.email }}</p><p v-if="admin.isCurrent" class="mt-1 text-xs font-semibold text-teal">目前帳號</p></td>
        <td class="px-4 py-4"><span class="rounded-md px-2.5 py-1 text-xs font-bold" :class="admin.isActive ? 'bg-teal/10 text-teal' : 'bg-slate-100 text-slate-600'">{{ admin.isActive ? '有效' : '已停用' }}</span></td>
        <td class="px-4 py-4 text-sm text-muted"><p>授權：{{ format(admin.grantedAt) }}</p><p v-if="admin.deactivatedAt" class="mt-1">停用：{{ format(admin.deactivatedAt) }}</p></td>
        <td class="px-4 py-4 text-sm text-muted">{{ format(admin.lastSignInAt) }}</td>
        <td class="px-4 py-4">
          <button type="button" class="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50" :disabled="admin.isCurrent || busyUserId === admin.userId" :title="admin.isCurrent ? '不可停用自己的帳號' : undefined" @click="emit('setActive', admin, !admin.isActive)">
            <Loader2 v-if="busyUserId === admin.userId" class="size-4 animate-spin" aria-hidden="true" />
            <ShieldOff v-else-if="admin.isActive" class="size-4" aria-hidden="true" />
            <ShieldCheck v-else class="size-4" aria-hidden="true" />
            {{ admin.isActive ? '停用' : '重新啟用' }}
          </button>
        </td>
      </tr>
    </tbody>
  </AdminDataTable>
</template>
