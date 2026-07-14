<script setup lang="ts">
import { Download, Pencil, Trash2 } from 'lucide-vue-next'
import type { Post } from '~/types/content'

definePageMeta({ layout: 'admin' })

const { posts } = useMockContent()
const repository = useAdminRepository()
const tablePosts = ref<Post[]>([])
const isLoading = ref(true)
const pageError = ref('')
const deleteTarget = ref<Post | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')

const loadPosts = async () => {
  isLoading.value = true
  pageError.value = ''
  try {
    tablePosts.value = await repository.listPosts()
  } catch (error) {
    tablePosts.value = [...posts]
    pageError.value = error instanceof Error ? error.message : 'Unable to load posts.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadPosts()
})

const exportPosts = () => {
  if (!import.meta.client) return
  const csv = toCsv(
    tablePosts.value.map((post) => ({
      title: post.title,
      slug: post.slug,
      publishedAt: post.publishedAt,
      status: post.status
    })),
    ['title', 'slug', 'publishedAt', 'status']
  )
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'posts.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const requestDelete = (post: Post) => {
  deleteTarget.value = post
  deleteError.value = ''
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await repository.deletePost(deleteTarget.value.id)
    tablePosts.value = tablePosts.value.filter((post) => post.id !== deleteTarget.value?.id)
    deleteTarget.value = null
  } catch {
    deleteError.value = 'Unable to delete this post. Please try again.'
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

    <AdminAdminDataTable v-else title="消息管理" description="最新消息、公告與內容文章。">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-cloud"
            @click="exportPosts"
          >
            <Download class="size-4" aria-hidden="true" />
            CSV
          </button>
          <CommonBaseButton to="/admin/posts/create">新增消息</CommonBaseButton>
        </div>
      </template>
      <thead class="bg-cloud text-left text-xs font-bold uppercase tracking-wide text-muted">
        <tr>
          <th class="px-5 py-3">標題</th>
          <th class="px-5 py-3">發布時間</th>
          <th class="px-5 py-3">狀態</th>
          <th class="px-5 py-3">操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr v-for="post in tablePosts" :key="post.id">
          <td class="px-5 py-4">
            <p class="font-semibold text-ink">{{ post.title }}</p>
            <p class="mt-1 text-xs text-muted">{{ post.slug }}</p>
          </td>
          <td class="px-5 py-4 text-muted">{{ formatDate(post.publishedAt) }}</td>
          <td class="px-5 py-4"><AdminStatusBadge :status="post.status" /></td>
          <td class="px-5 py-4">
            <div class="flex flex-wrap gap-2">
              <NuxtLink
                :to="`/admin/posts/edit/${post.id}`"
                class="focus-ring inline-flex items-center gap-2 rounded-md bg-cloud px-3 py-2 text-sm font-bold text-ink"
              >
                <Pencil class="size-4" aria-hidden="true" />
                編輯
              </NuxtLink>
              <button
                type="button"
                class="focus-ring inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                @click="requestDelete(post)"
              >
                <Trash2 class="size-4" aria-hidden="true" />
                刪除
              </button>
            </div>
          </td>
        </tr>
        <tr v-if="!tablePosts.length">
          <td colspan="4" class="px-5 py-8 text-center text-sm text-muted">目前沒有消息資料。</td>
        </tr>
      </tbody>
    </AdminAdminDataTable>

    <AdminConfirmModal
      :open="Boolean(deleteTarget)"
      title="刪除消息"
      :message="`確定要刪除「${deleteTarget?.title ?? ''}」嗎？這個動作目前只會影響本頁 mock 狀態。`"
      confirm-label="刪除"
      cancel-label="取消"
      :is-loading="isDeleting"
      :error="deleteError"
      @cancel="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
