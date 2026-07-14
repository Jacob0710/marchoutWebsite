<script setup lang="ts">
import { CalendarDays, FileText, Newspaper, UsersRound } from 'lucide-vue-next'
import type { Activity, FileResource, Post } from '~/types/content'

import AdminDataTable from '~/components/admin/AdminDataTable.vue'

definePageMeta({
  layout: 'admin'
})

const { activities: fallbackActivities, files: fallbackFiles, posts: fallbackPosts, years } = useMockContent()
const repository = useAdminRepository()
const activities = ref<Activity[]>([])
const posts = ref<Post[]>([])
const files = ref<FileResource[]>([])
const isLoading = ref(true)
const pageError = ref('')

const loadDashboard = async () => {
  isLoading.value = true
  pageError.value = ''
  try {
    const [activityData, postData, fileData] = await Promise.all([
      repository.listActivities(),
      repository.listPosts(),
      repository.listFiles()
    ])
    activities.value = activityData
    posts.value = postData
    files.value = fileData
  } catch (error) {
    activities.value = [...fallbackActivities]
    posts.value = [...fallbackPosts]
    files.value = [...fallbackFiles]
    pageError.value = error instanceof Error ? error.message : 'Unable to load dashboard data.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})

const metrics = computed(() => [
  { label: '活動', value: activities.value.length, icon: CalendarDays, color: 'text-coral' },
  { label: '消息', value: posts.value.length, icon: Newspaper, color: 'text-teal' },
  { label: '檔案', value: files.value.length, icon: FileText, color: 'text-honey' },
  { label: '年度', value: years.length, icon: UsersRound, color: 'text-ink' }
])
</script>

<template>
  <div class="grid gap-6">
    <p v-if="pageError" class="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {{ pageError }}
    </p>

    <CommonLoadingState v-if="isLoading" />

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="metric in metrics" :key="metric.label" class="rounded-lg bg-white p-5 shadow-sm">
          <component :is="metric.icon" class="size-6" :class="metric.color" aria-hidden="true" />
          <p class="mt-5 text-3xl font-bold text-ink">{{ metric.value }}</p>
          <p class="mt-1 text-sm font-semibold text-muted">{{ metric.label }}</p>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminDataTable title="近期活動" description="依活動日期排序的公開活動。">
          <template #actions>
            <CommonBaseButton to="/admin/activities/create">新增活動</CommonBaseButton>
          </template>
          <thead class="bg-cloud text-left text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              <th class="px-5 py-3">活動</th>
              <th class="px-5 py-3">年度</th>
              <th class="px-5 py-3">狀態</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="activity in activities.slice(0, 5)" :key="activity.id">
              <td class="px-5 py-4 font-semibold text-ink">{{ activity.title }}</td>
              <td class="px-5 py-4 text-muted">{{ activity.academicYear }}</td>
              <td class="px-5 py-4"><AdminStatusBadge :status="activity.status" /></td>
            </tr>
          </tbody>
        </AdminDataTable>

        <section class="rounded-lg bg-white p-5 shadow-sm">
          <h2 class="text-lg font-bold text-ink">內容任務</h2>
          <div class="mt-5 grid gap-3">
            <NuxtLink to="/admin/posts" class="focus-ring rounded-md bg-cloud px-4 py-3 text-sm font-semibold text-ink">
              檢查最新消息排程
            </NuxtLink>
            <NuxtLink to="/admin/files" class="focus-ring rounded-md bg-cloud px-4 py-3 text-sm font-semibold text-ink">
              更新成果檔案
            </NuxtLink>
            <NuxtLink to="/admin/settings" class="focus-ring rounded-md bg-cloud px-4 py-3 text-sm font-semibold text-ink">
              確認聯絡資訊
            </NuxtLink>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
