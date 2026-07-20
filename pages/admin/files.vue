<script setup lang="ts">
import { FilePlus2, Loader2, Trash2 } from 'lucide-vue-next'
import type { AdminFileResource, PaginatedAdminResponse } from '~/types/coreContent'
definePageMeta({ layout: 'admin' })
const api = useCoreContentAdmin()
const { data, pending, error, refresh } = await useFetch<PaginatedAdminResponse<AdminFileResource>>('/api/admin/files', { default: () => ({ items: [], total: 0 }) })
const form = reactive({ title: '', description: '', academicYear: '' as number | '', category: '', sortOrder: 0 })
const uploadFile = ref<File | null>(null)
const editingId = ref('')
const busy = ref(false)
const message = ref('')
const pageError = ref('')
const deleteTarget = ref<AdminFileResource | null>(null)
const reset = () => { Object.assign(form, { title: '', description: '', academicYear: '', category: '', sortOrder: 0 }); uploadFile.value = null; editingId.value = '' }
const edit = (item: AdminFileResource) => { editingId.value = item.id; Object.assign(form, { title: item.title, description: item.description, academicYear: item.academicYear ?? '', category: item.category, sortOrder: item.sortOrder }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
const chooseUpload = (event: Event) => { uploadFile.value = (event.target as HTMLInputElement).files?.[0] ?? null }
const submit = async () => {
  busy.value = true; pageError.value = ''; message.value = ''
  try {
    const metadata = { title: form.title, description: form.description, academicYear: form.academicYear === '' ? null : Number(form.academicYear), category: form.category, sortOrder: form.sortOrder }
    if (editingId.value) await api.updateFile(editingId.value, metadata)
    else {
      const created = await api.createFile(metadata)
      if (uploadFile.value) { const body = new FormData(); body.append('file', uploadFile.value); await api.upload(`/api/admin/files/${created.item.id}/upload`, body) }
    }
    message.value = editingId.value ? '檔案資料已更新。' : '檔案草稿已建立。'; reset(); await refresh()
  } catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false }
}
const replace = async (item: AdminFileResource, event: Event) => { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; busy.value = true; try { const body = new FormData(); body.append('file', file); await api.upload(`/api/admin/files/${item.id}/replace`, body); message.value = '檔案已替換。'; await refresh() } catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false; input.value = '' } }
const toggle = async (item: AdminFileResource) => { busy.value = true; try { await api.mutate(`/api/admin/files/${item.id}/${item.status === 'draft' ? 'publish' : 'unpublish'}`); await refresh() } catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false } }
const remove = async () => { if (!deleteTarget.value) return; busy.value = true; try { await api.mutate(`/api/admin/files/${deleteTarget.value.id}`, 'DELETE'); deleteTarget.value = null; await refresh() } catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false } }
</script>
<template><div class="grid gap-6">
  <div><p class="text-sm font-bold text-coral">Files</p><h1 class="mt-1 text-3xl font-bold text-ink">檔案下載管理</h1></div>
  <AdminFormSection :title="editingId ? '編輯檔案資料' : '新增檔案草稿'" description="允許 PDF、TXT、JPG、PNG、DOCX、XLSX、PPTX，最大 20 MB。"><form class="grid gap-4" @submit.prevent="submit"><p v-if="pageError" role="alert" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ pageError }}</p><p v-if="message" class="rounded-md bg-teal/10 p-3 text-sm text-teal">{{ message }}</p><div class="grid gap-4 md:grid-cols-2"><label class="grid gap-2 text-sm font-semibold">標題<input v-model="form.title" required maxlength="200" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">分類<input v-model="form.category" maxlength="100" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">學年度<input v-model="form.academicYear" type="number" min="90" max="200" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">排序<input v-model.number="form.sortOrder" type="number" min="0" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label></div><label class="grid gap-2 text-sm font-semibold">描述<textarea v-model="form.description" maxlength="5000" class="focus-ring min-h-24 rounded-md border border-slate-200 p-3" /></label><label v-if="!editingId" class="grid gap-2 text-sm font-semibold">檔案（可稍後上傳）<input type="file" class="focus-ring rounded-md border border-slate-200 p-2" @change="chooseUpload" /></label><div class="flex justify-end gap-2"><button v-if="editingId" type="button" class="focus-ring rounded-md border px-4 py-2 font-bold" @click="reset">取消</button><button class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-bold text-white" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /><FilePlus2 v-else class="size-4" />{{ editingId ? '更新資料' : '建立草稿' }}</button></div></form></AdminFormSection>
  <CommonLoadingState v-if="pending" /><CommonEmptyState v-else-if="error" title="檔案載入失敗" description="請重新整理頁面。" />
  <AdminDataTable v-else title="檔案清單" :description="`共 ${data?.total ?? 0} 筆`"><thead class="bg-cloud text-left text-xs font-bold uppercase text-muted"><tr><th class="px-5 py-3">檔案</th><th class="px-5 py-3">狀態</th><th class="px-5 py-3">上傳</th><th class="px-5 py-3">操作</th></tr></thead><tbody class="divide-y divide-slate-200"><tr v-for="item in data?.items" :key="item.id"><td class="px-5 py-4"><p class="font-bold">{{ item.title }}</p><p class="text-xs text-muted">{{ item.originalFilename || '尚未上傳' }}</p></td><td class="px-5 py-4"><AdminStatusBadge :status="item.status" /></td><td class="px-5 py-4"><label class="focus-ring inline-flex cursor-pointer rounded-md border px-3 py-2 text-sm font-bold">{{ item.hasUpload ? '替換' : '上傳' }}<input type="file" class="sr-only" :disabled="busy" @change="replace(item, $event)" /></label></td><td class="px-5 py-4"><div class="flex flex-wrap gap-2"><button class="focus-ring rounded-md border px-3 py-2 text-sm font-bold" @click="edit(item)">編輯</button><a v-if="item.hasUpload" :href="item.downloadUrl" class="focus-ring rounded-md border px-3 py-2 text-sm font-bold">測試下載</a><button class="focus-ring rounded-md bg-teal/10 px-3 py-2 text-sm font-bold text-teal" :disabled="busy || (!item.hasUpload && item.status === 'draft')" @click="toggle(item)">{{ item.status === 'draft' ? '發布' : '撤回' }}</button><button class="focus-ring rounded-md bg-red-50 p-2 text-red-700" aria-label="刪除檔案" @click="deleteTarget = item"><Trash2 class="size-4" /></button></div></td></tr><tr v-if="!data?.items.length"><td colspan="4" class="px-5 py-8 text-center text-muted">目前沒有檔案。</td></tr></tbody></AdminDataTable>
  <AdminConfirmModal :open="Boolean(deleteTarget)" title="刪除檔案" :message="`確定刪除「${deleteTarget?.title ?? ''}」及其私有檔案嗎？`" confirm-label="刪除" :is-loading="busy" :error="pageError" @cancel="deleteTarget = null" @confirm="remove" />
</div></template>
