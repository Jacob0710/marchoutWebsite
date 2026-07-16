<script setup lang="ts">
import type { AdminActivity, AdminActivityVideo } from '~/types/adminActivity'
const props = defineProps<{ activity: AdminActivity }>()
const emit = defineEmits<{ refresh: [] }>()
const form = reactive({ url: '', title: '', sortOrder: 0 })
const busy = ref('')
const errorMessage = ref('')
const pendingDelete = ref<AdminActivityVideo | null>(null)
const create = async () => {
  busy.value = 'create'; errorMessage.value = ''
  try { await $fetch(`/api/admin/activities/${props.activity.id}/videos`, { method: 'POST', body: form }); Object.assign(form, { url: '', title: '', sortOrder: 0 }); emit('refresh') }
  catch (error) { errorMessage.value = getAdminApiMessage(error) }
  finally { busy.value = '' }
}
const save = async (video: AdminActivityVideo) => {
  busy.value = video.id; errorMessage.value = ''
  try { await $fetch(`/api/admin/activity-videos/${video.id}`, { method: 'PATCH', body: { url: video.url, title: video.title, sortOrder: video.sortOrder } }); emit('refresh') }
  catch (error) { errorMessage.value = getAdminApiMessage(error) }
  finally { busy.value = '' }
}
const remove = async () => {
  if (!pendingDelete.value) return
  busy.value = pendingDelete.value.id
  try { await $fetch(`/api/admin/activity-videos/${pendingDelete.value.id}`, { method: 'DELETE' }); pendingDelete.value = null; emit('refresh') }
  catch (error) { errorMessage.value = getAdminApiMessage(error) }
  finally { busy.value = '' }
}
</script>
<template>
  <AdminFormSection title="外部影片" description="僅保存 HTTPS 連結；YouTube 與 Vimeo 會轉為安全預覽。">
    <p v-if="errorMessage" class="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ errorMessage }}</p>
    <form class="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[2fr_1fr_100px_auto]" @submit.prevent="create">
      <input v-model="form.url" type="url" required placeholder="https://..." class="h-11 rounded-md border border-slate-200 px-3" aria-label="影片 URL" />
      <input v-model="form.title" placeholder="顯示名稱" class="h-11 rounded-md border border-slate-200 px-3" aria-label="影片名稱" />
      <input v-model.number="form.sortOrder" type="number" min="0" class="h-11 rounded-md border border-slate-200 px-3" aria-label="排序" />
      <CommonBaseButton type="submit" :disabled="busy === 'create'">新增</CommonBaseButton>
    </form>
    <div v-if="activity.videos.length" class="mt-5 grid gap-3">
      <article v-for="video in activity.videos" :key="video.id" class="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[2fr_1fr_100px_auto]">
        <input v-model="video.url" class="h-10 rounded-md border border-slate-200 px-3" aria-label="影片 URL" />
        <input v-model="video.title" class="h-10 rounded-md border border-slate-200 px-3" aria-label="影片名稱" />
        <input v-model.number="video.sortOrder" type="number" min="0" class="h-10 rounded-md border border-slate-200 px-3" aria-label="排序" />
        <div class="flex gap-2"><button class="focus-ring rounded-md border px-3 text-sm font-bold" @click="save(video)">儲存</button><button class="focus-ring px-3 text-sm font-bold text-red-700" @click="pendingDelete = video">刪除</button></div>
        <a :href="video.url" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-teal underline">開啟外部連結</a>
      </article>
    </div>
    <CommonEmptyState v-else class="mt-5" title="尚無影片" description="新增合法的 HTTPS 外部影片連結。" />
    <AdminConfirmModal :open="Boolean(pendingDelete)" title="刪除影片" :message="`確定刪除「${pendingDelete?.title || pendingDelete?.url || ''}」？`" confirm-label="刪除" cancel-label="取消" :is-loading="Boolean(busy)" @cancel="pendingDelete = null" @confirm="remove" />
  </AdminFormSection>
</template>
