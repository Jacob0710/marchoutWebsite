<script setup lang="ts">
import { Download, Loader2, Pencil, Trash2 } from 'lucide-vue-next'
import type { Activity } from '~/types/content'
import { activityTypeLabels } from '~/utils/mockData'

definePageMeta({ layout: 'admin' })

const { activities } = useMockContent()
const repository = useAdminRepository()
const tableActivities = ref<Activity[]>([])
const isLoading = ref(true)
const pageError = ref('')
const deleteTarget = ref<Activity | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')

const loadActivities = async () => {
  isLoading.value = true
  pageError.value = ''
  try {
    tableActivities.value = await repository.listActivities()
  } catch (error) {
    tableActivities.value = [...activities]
    pageError.value = error instanceof Error ? error.message : 'Unable to load activities.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadActivities()
})

const exportActivities = () => {
  if (!import.meta.client) return
  const csv = toCsv(
    tableActivities.value.map((activity) => ({
      title: activity.title,
      academicYear: activity.academicYear,
      activityType: activityTypeLabels[activity.activityType],
      eventDate: activity.eventDate,
      location: activity.location,
      status: activity.status
    })),
    ['title', 'academicYear', 'activityType', 'eventDate', 'location', 'status']
  )
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'activities.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const requestDelete = (activity: Activity) => {
  deleteTarget.value = activity
  deleteError.value = ''
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await repository.deleteActivity(deleteTarget.value.id)
    tableActivities.value = tableActivities.value.filter((activity) => activity.id !== deleteTarget.value?.id)
    deleteTarget.value = null
  } catch {
    deleteError.value = 'Unable to delete this activity. Please try again.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="grid gap-4">
    <p v-if="pageError" class="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {{ pageError }}
    </p>

    <CommonLoadingState v-if="isLoading" />

    <AdminAdminDataTable v-else title="活動管理" description="活動清單、發布狀態與編輯入口。">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-cloud"
            @click="exportActivities"
          >
            <Download class="size-4" aria-hidden="true" />
            CSV
          </button>
          <CommonBaseButton to="/admin/activities/create">新增活動</CommonBaseButton>
        </div>
      </template>
      <thead class="bg-cloud text-left text-xs font-bold uppercase tracking-wide text-muted">
        <tr>
          <th class="px-5 py-3">標題</th>
          <th class="px-5 py-3">年度</th>
          <th class="px-5 py-3">類型</th>
          <th class="px-5 py-3">日期</th>
          <th class="px-5 py-3">狀態</th>
          <th class="px-5 py-3">操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr v-for="activity in tableActivities" :key="activity.id">
          <td class="px-5 py-4 font-semibold text-ink">{{ activity.title }}</td>
          <td class="px-5 py-4 text-muted">{{ activity.academicYear }}</td>
          <td class="px-5 py-4 text-muted">{{ activityTypeLabels[activity.activityType] }}</td>
          <td class="px-5 py-4 text-muted">{{ toMinguoDate(activity.eventDate) }}</td>
          <td class="px-5 py-4"><AdminStatusBadge :status="activity.status" /></td>
          <td class="px-5 py-4">
            <div class="flex flex-wrap gap-2">
              <NuxtLink
                :to="`/admin/activities/edit/${activity.id}`"
                class="focus-ring inline-flex items-center gap-2 rounded-md bg-cloud px-3 py-2 text-sm font-bold text-ink"
              >
                <Pencil class="size-4" aria-hidden="true" />
                編輯
              </NuxtLink>
              <button
                type="button"
                class="focus-ring inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                @click="requestDelete(activity)"
              >
                <Trash2 class="size-4" aria-hidden="true" />
                刪除
              </button>
            </div>
          </td>
        </tr>
        <tr v-if="!tableActivities.length">
          <td colspan="6" class="px-5 py-8 text-center text-sm text-muted">目前沒有活動資料。</td>
        </tr>
      </tbody>
    </AdminAdminDataTable>

    <AdminConfirmModal
      :open="Boolean(deleteTarget)"
      title="刪除活動"
      :message="`確定要刪除「${deleteTarget?.title ?? ''}」嗎？這個動作目前只會影響本頁 mock 狀態。`"
      confirm-label="刪除"
      cancel-label="取消"
      :is-loading="isDeleting"
      :error="deleteError"
      @cancel="deleteTarget = null"
      @confirm="confirmDelete"
    >
      <Loader2 v-if="isDeleting" class="size-4 animate-spin" aria-hidden="true" />
    </AdminConfirmModal>
  </div>
</template>
