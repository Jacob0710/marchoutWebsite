<script setup lang="ts">
import { Loader2, Paperclip, Star, Trash2, Upload } from 'lucide-vue-next'
import type { AdminActivity, AdminActivityAsset, ActivityAssetKind } from '~/types/adminActivity'

const props = defineProps<{ activity: AdminActivity }>()
const emit = defineEmits<{ refresh: [] }>()
const kind = ref<ActivityAssetKind>('image')
const file = ref<File | null>(null)
const altText = ref('')
const sortOrder = ref(0)
const busy = ref('')
const message = ref('')
const errorMessage = ref('')
const pendingDelete = ref<AdminActivityAsset | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const upload = async () => {
  if (!file.value) { errorMessage.value = '請選擇檔案。'; return }
  busy.value = 'upload'; errorMessage.value = ''; message.value = ''
  const body = new FormData()
  body.append('file', file.value)
  body.append('kind', kind.value)
  body.append('altText', altText.value)
  body.append('sortOrder', String(sortOrder.value))
  try {
    await $fetch(`/api/admin/activities/${props.activity.id}/assets`, { method: 'POST', body })
    message.value = '資產已上傳。'; file.value = null; altText.value = ''; sortOrder.value = 0
    if (fileInput.value) fileInput.value.value = ''
    emit('refresh')
  } catch (error) { errorMessage.value = getAdminApiMessage(error, '上傳失敗。') }
  finally { busy.value = '' }
}

const saveMetadata = async (asset: AdminActivityAsset) => {
  busy.value = asset.id; errorMessage.value = ''
  try {
    await $fetch(`/api/admin/activity-assets/${asset.id}`, { method: 'PATCH', body: { altText: asset.altText, sortOrder: asset.sortOrder } })
    message.value = '資產資料已更新。'; emit('refresh')
  } catch (error) { errorMessage.value = getAdminApiMessage(error) }
  finally { busy.value = '' }
}
const setCover = async (assetId: string | null) => {
  busy.value = `cover-${assetId}`; errorMessage.value = ''
  try { await $fetch(`/api/admin/activities/${props.activity.id}/cover`, { method: 'POST', body: { assetId } }); emit('refresh') }
  catch (error) { errorMessage.value = getAdminApiMessage(error) }
  finally { busy.value = '' }
}
const remove = async () => {
  if (!pendingDelete.value) return
  busy.value = pendingDelete.value.id; errorMessage.value = ''
  try { await $fetch(`/api/admin/activity-assets/${pendingDelete.value.id}`, { method: 'DELETE' }); pendingDelete.value = null; emit('refresh') }
  catch (error) { errorMessage.value = getAdminApiMessage(error) }
  finally { busy.value = '' }
}
const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
</script>

<template>
  <AdminFormSection title="圖片與附件" description="圖片上限 10 MB；附件上限 20 MB。所有檔案保存在私有 bucket。">
    <p v-if="message" class="mb-4 rounded-md bg-teal/10 px-3 py-2 text-sm text-teal">{{ message }}</p>
    <p v-if="errorMessage" class="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ errorMessage }}</p>
    <form class="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-4" @submit.prevent="upload">
      <label class="grid gap-2 text-sm font-semibold">種類<select v-model="kind" class="h-11 rounded-md border border-slate-200 px-3"><option value="image">圖片</option><option value="attachment">附件</option></select></label>
      <label class="grid gap-2 text-sm font-semibold md:col-span-2">檔案<input ref="fileInput" type="file" class="h-11 rounded-md border border-slate-200 p-2" @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null" /></label>
      <label class="grid gap-2 text-sm font-semibold">排序<input v-model.number="sortOrder" type="number" min="0" class="h-11 rounded-md border border-slate-200 px-3" /></label>
      <label v-if="kind === 'image'" class="grid gap-2 text-sm font-semibold md:col-span-3">替代文字<input v-model="altText" class="h-11 rounded-md border border-slate-200 px-3" /></label>
      <CommonBaseButton type="submit" :disabled="busy === 'upload'"><Loader2 v-if="busy === 'upload'" class="size-4 animate-spin" /><Upload v-else class="size-4" />上傳</CommonBaseButton>
    </form>
    <div v-if="activity.assets.length" class="mt-6 grid gap-4">
      <article v-for="asset in activity.assets" :key="asset.id" class="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-[120px_1fr_auto]">
        <img v-if="asset.kind === 'image'" :src="asset.fileUrl" :alt="asset.altText || asset.originalName" class="aspect-square w-full rounded-md object-cover" />
        <div v-else class="grid aspect-square place-items-center rounded-md bg-cloud"><Paperclip class="size-7 text-teal" /></div>
        <div class="grid gap-3">
          <div><p class="font-bold">{{ asset.originalName }}</p><p class="text-xs text-muted">{{ asset.mimeType }} · {{ formatSize(asset.sizeBytes) }}</p></div>
          <label v-if="asset.kind === 'image'" class="grid gap-1 text-xs font-semibold">替代文字<input v-model="asset.altText" class="h-10 rounded-md border border-slate-200 px-3" /></label>
          <label class="grid gap-1 text-xs font-semibold">排序<input v-model.number="asset.sortOrder" type="number" min="0" class="h-10 rounded-md border border-slate-200 px-3" /></label>
        </div>
        <div class="flex flex-col gap-2">
          <button class="focus-ring rounded-md border px-3 py-2 text-sm font-bold" @click="saveMetadata(asset)">儲存</button>
          <button v-if="asset.kind === 'image'" class="focus-ring inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold" @click="setCover(asset.isCover ? null : asset.id)"><Star class="size-4" />{{ asset.isCover ? '清除封面' : '設為封面' }}</button>
          <button class="focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-red-700" @click="pendingDelete = asset"><Trash2 class="size-4" />刪除</button>
        </div>
      </article>
    </div>
    <CommonEmptyState v-else class="mt-6" title="尚無資產" description="上傳圖片或附件後會顯示在這裡。" />
    <AdminConfirmModal :open="Boolean(pendingDelete)" title="刪除資產" :message="`「${pendingDelete?.originalName ?? ''}」將永久刪除。`" confirm-label="永久刪除" cancel-label="取消" :is-loading="Boolean(busy)" @cancel="pendingDelete = null" @confirm="remove" />
  </AdminFormSection>
</template>
