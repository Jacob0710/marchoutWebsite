<script setup lang="ts">
import { Plus, Search } from 'lucide-vue-next'
import type { AdminActivityListRow } from '~/types/adminActivity'
import { activityTypeLabels } from '~/shared/activityRules'

definePageMeta({ layout: 'admin' })
useSeo({ title: '活動管理', description: '新增、編輯、發布與管理活動資產。' })
const status = ref('all')
const category = ref('')
const year = ref('')
const q = ref('')
const { data: activities, pending, error, refresh } = await useAdminActivities({ status, category, year, q })
const mutations = useAdminActivityMutations()
const pendingAction = ref<{ type: 'publish' | 'unpublish' | 'delete'; activity: AdminActivityListRow } | null>(null)
const actionBusy = ref(false)
const actionError = ref('')
const years = computed(() => [...new Set((activities.value ?? []).map((activity) => activity.academicYear))].sort((a, b) => b - a))
const runAction = async () => {
  if (!pendingAction.value) return
  actionBusy.value = true; actionError.value = ''
  try {
    const { type, activity } = pendingAction.value
    if (type === 'publish') await mutations.publish(activity.id)
    else if (type === 'unpublish') await mutations.unpublish(activity.id)
    else await mutations.remove(activity.id)
    pendingAction.value = null
    await refresh()
  } catch (err) { actionError.value = getAdminApiMessage(err) }
  finally { actionBusy.value = false }
}
const formatDate = (value: string | null) => value ? toMinguoDate(value) : '未設定'
</script>

<template>
  <div class="grid gap-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div><h1 class="text-2xl font-bold">活動管理</h1><p class="mt-1 text-sm text-muted">管理草稿、發布狀態、圖片、附件與影片。</p></div>
      <CommonBaseButton to="/admin/activities/new"><Plus class="size-4" />新增活動</CommonBaseButton>
    </div>
    <section class="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
      <label class="grid gap-1 text-xs font-bold">狀態<select v-model="status" class="h-10 rounded-md border border-slate-200 px-3"><option value="all">全部</option><option value="draft">草稿</option><option value="published">已發布</option></select></label>
      <label class="grid gap-1 text-xs font-bold">分類<select v-model="category" class="h-10 rounded-md border border-slate-200 px-3"><option value="">全部</option><option v-for="(label, value) in activityTypeLabels" :key="value" :value="value">{{ label }}</option></select></label>
      <label class="grid gap-1 text-xs font-bold">學年度<select v-model="year" class="h-10 rounded-md border border-slate-200 px-3"><option value="">全部</option><option v-for="item in years" :key="item" :value="String(item)">{{ item }}</option></select></label>
      <label class="grid gap-1 text-xs font-bold">搜尋<span class="relative"><Search class="absolute left-3 top-3 size-4 text-muted" /><input v-model="q" class="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3" placeholder="標題或 slug" /></span></label>
    </section>
    <CommonLoadingState v-if="pending" />
    <section v-else-if="error" class="rounded-md bg-red-50 p-4 text-sm text-red-700"><p>活動資料暫時無法載入。</p><button class="mt-2 font-bold underline" @click="refresh()">重新載入</button></section>
    <CommonEmptyState v-else-if="!activities?.length" title="沒有符合條件的活動" description="新增草稿或調整篩選條件。" />
    <AdminDataTable v-else title="活動列表" :description="`共 ${activities.length} 筆`">
      <thead class="bg-cloud text-left text-xs font-bold text-muted"><tr><th class="px-4 py-3">活動</th><th class="px-4 py-3">年度／分類</th><th class="px-4 py-3">日期</th><th class="px-4 py-3">狀態</th><th class="px-4 py-3">資產</th><th class="px-4 py-3">操作</th></tr></thead>
      <tbody class="divide-y divide-slate-200">
        <tr v-for="activity in activities" :key="activity.id">
          <td class="px-4 py-4"><p class="font-bold">{{ activity.title }}</p><p class="mt-1 font-mono text-xs text-muted">{{ activity.slug }}</p></td>
          <td class="px-4 py-4 text-sm">{{ activity.academicYear }}／{{ activityTypeLabels[activity.activityType] }}</td>
          <td class="px-4 py-4 text-sm text-muted">{{ formatDate(activity.eventDate) }}</td>
          <td class="px-4 py-4"><AdminStatusBadge :status="activity.status" /></td>
          <td class="px-4 py-4 text-sm text-muted">{{ activity.assetCount }} 個檔案／{{ activity.videoCount }} 部影片</td>
          <td class="px-4 py-4"><div class="flex flex-wrap gap-2"><NuxtLink :to="`/admin/activities/${activity.id}/edit`" class="focus-ring rounded-md border px-3 py-2 text-xs font-bold">編輯</NuxtLink><button class="focus-ring rounded-md border px-3 py-2 text-xs font-bold" @click="pendingAction = { type: activity.status === 'draft' ? 'publish' : 'unpublish', activity }">{{ activity.status === 'draft' ? '發布' : '撤回' }}</button><button class="focus-ring px-3 py-2 text-xs font-bold text-red-700" @click="pendingAction = { type: 'delete', activity }">刪除</button></div></td>
        </tr>
      </tbody>
    </AdminDataTable>
    <AdminConfirmModal :open="Boolean(pendingAction)" :title="pendingAction?.type === 'delete' ? '刪除活動' : pendingAction?.type === 'publish' ? '發布活動' : '撤回活動'" :message="pendingAction?.type === 'delete' ? `「${pendingAction?.activity.title}」及其資產將永久刪除。` : pendingAction?.type === 'publish' ? '發布後內容與資產立即公開。' : '撤回後公開內容立即不可見。'" :confirm-label="pendingAction?.type === 'delete' ? '永久刪除' : '確認'" cancel-label="取消" :is-loading="actionBusy" :error="actionError" @cancel="pendingAction = null" @confirm="runAction" />
  </div>
</template>
