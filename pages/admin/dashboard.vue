<script setup lang="ts">
import { CalendarDays, FileText, HelpCircle, Newspaper, UsersRound } from 'lucide-vue-next'
import type { AdminFileResource, AdminPost, AdminYearSummary, CoreFaqItem, PaginatedAdminResponse } from '~/types/coreContent'
import type { AdminActivityListRow } from '~/types/adminActivity'

definePageMeta({ layout: 'admin' })
interface DashboardData {
  activities: AdminActivityListRow[]
  posts: PaginatedAdminResponse<AdminPost>
  files: PaginatedAdminResponse<AdminFileResource>
  faq: { items: CoreFaqItem[] }
  years: PaginatedAdminResponse<AdminYearSummary>
}
const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
const { data, pending, error, refresh } = await useAsyncData<DashboardData>('admin-dashboard', async () => {
  const [activityResult, posts, files, faq, years] = await Promise.all([
    $fetch<{ activities: AdminActivityListRow[] }>('/api/admin/activities', { headers: requestHeaders }),
    $fetch<PaginatedAdminResponse<AdminPost>>('/api/admin/posts', { headers: requestHeaders }),
    $fetch<PaginatedAdminResponse<AdminFileResource>>('/api/admin/files', { headers: requestHeaders }),
    $fetch<{ items: CoreFaqItem[] }>('/api/admin/faq', { headers: requestHeaders }),
    $fetch<PaginatedAdminResponse<AdminYearSummary>>('/api/admin/years', { headers: requestHeaders })
  ])
  return { activities: activityResult.activities, posts, files, faq, years }
})
const metrics = computed(() => [
  { label: '活動', value: data.value?.activities.length ?? 0, icon: CalendarDays, color: 'text-coral' },
  { label: '消息', value: data.value?.posts.total ?? 0, icon: Newspaper, color: 'text-teal' },
  { label: '檔案', value: data.value?.files.total ?? 0, icon: FileText, color: 'text-honey' },
  { label: 'FAQ', value: data.value?.faq.items.length ?? 0, icon: HelpCircle, color: 'text-teal' },
  { label: '年度成果', value: data.value?.years.total ?? 0, icon: UsersRound, color: 'text-ink' }
])
</script>
<template><div class="grid gap-6"><div class="flex items-center justify-between"><div><p class="text-sm font-bold text-coral">Dashboard</p><h1 class="mt-1 text-3xl font-bold text-ink">內容總覽</h1></div><button class="focus-ring rounded-md border px-4 py-2 text-sm font-bold" @click="refresh">重新整理</button></div><CommonLoadingState v-if="pending" /><CommonEmptyState v-else-if="error" title="總覽載入失敗" description="請重新整理或重新登入。" /><template v-else><div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><div v-for="metric in metrics" :key="metric.label" class="rounded-lg bg-white p-5 shadow-sm"><component :is="metric.icon" class="size-6" :class="metric.color" aria-hidden="true" /><p class="mt-5 text-3xl font-bold text-ink">{{ metric.value }}</p><p class="mt-1 text-sm font-semibold text-muted">{{ metric.label }}</p></div></div><div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"><AdminDataTable title="最近更新活動"><thead class="bg-cloud text-left text-xs font-bold uppercase text-muted"><tr><th class="px-5 py-3">活動</th><th class="px-5 py-3">學年度</th><th class="px-5 py-3">狀態</th></tr></thead><tbody class="divide-y divide-slate-200"><tr v-for="activity in data?.activities.slice(0, 5)" :key="activity.id"><td class="px-5 py-4 font-semibold">{{ activity.title }}</td><td class="px-5 py-4 text-muted">{{ activity.academicYear }}</td><td class="px-5 py-4"><AdminStatusBadge :status="activity.status" /></td></tr><tr v-if="!data?.activities.length"><td colspan="3" class="px-5 py-8 text-center text-muted">目前沒有活動。</td></tr></tbody></AdminDataTable><section class="rounded-lg bg-white p-5 shadow-sm"><h2 class="text-lg font-bold text-ink">快速前往</h2><nav class="mt-5 grid gap-3" aria-label="內容管理捷徑"><NuxtLink v-for="item in [{ to: '/admin/activities/create', label: '新增活動' }, { to: '/admin/posts/create', label: '新增消息' }, { to: '/admin/files', label: '管理檔案' }, { to: '/admin/faq', label: '管理 FAQ' }, { to: '/admin/years', label: '管理年度成果' }, { to: '/admin/settings', label: '站點設定' }]" :key="item.to" :to="item.to" class="focus-ring rounded-md bg-cloud px-4 py-3 text-sm font-semibold text-ink">{{ item.label }}</NuxtLink></nav></section></div></template></div></template>
