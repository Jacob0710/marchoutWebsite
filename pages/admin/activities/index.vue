<script setup lang="ts">
import AdminDataTable from '~/components/admin/AdminDataTable.vue'

definePageMeta({ layout: 'admin' })

const { data: activities, pending, error, refresh } = await useAdminActivities()

useSeo({
  title: '活動唯讀檢視',
  description: '管理員唯讀活動列表。'
})

const formatDate = (value: string | null) => value ? toMinguoDate(value) : '未設定'
const formatTimestamp = (value: string) => value.slice(0, 10)
</script>

<template>
  <div class="grid gap-4">
    <CommonLoadingState v-if="pending" />

    <section v-else-if="error" class="rounded-md bg-red-50 px-4 py-4 text-sm text-red-700">
      <p class="font-semibold">活動資料暫時無法載入。</p>
      <button type="button" class="focus-ring mt-3 font-bold underline" @click="refresh()">重新載入</button>
    </section>

    <CommonEmptyState
      v-else-if="!activities?.length"
      title="目前沒有活動資料"
      description="資料庫查詢成功，但尚無可顯示的活動。"
    />

    <AdminDataTable v-else title="活動唯讀檢視" description="依活動日期排序，包含已發布與草稿活動。">
      <thead class="bg-cloud text-left text-xs font-bold uppercase tracking-wide text-muted">
        <tr>
          <th class="px-5 py-3">活動</th>
          <th class="px-5 py-3">Slug</th>
          <th class="px-5 py-3">狀態</th>
          <th class="px-5 py-3">活動日期</th>
          <th class="px-5 py-3">建立日期</th>
          <th class="px-5 py-3">已發布</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr v-for="activity in activities ?? []" :key="activity.id">
          <td class="px-5 py-4 font-semibold text-ink">{{ activity.title }}</td>
          <td class="px-5 py-4 font-mono text-xs text-muted">{{ activity.slug }}</td>
          <td class="px-5 py-4"><AdminStatusBadge :status="activity.status" /></td>
          <td class="px-5 py-4 text-muted">{{ formatDate(activity.eventDate) }}</td>
          <td class="px-5 py-4 text-muted">{{ formatTimestamp(activity.createdAt) }}</td>
          <td class="px-5 py-4 font-semibold" :class="activity.status === 'published' ? 'text-teal' : 'text-muted'">
            {{ activity.status === 'published' ? '是' : '否' }}
          </td>
        </tr>
      </tbody>
    </AdminDataTable>
  </div>
</template>
