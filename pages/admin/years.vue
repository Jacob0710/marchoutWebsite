<script setup lang="ts">
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import type { AdminFileResource, AdminYearSummary, PaginatedAdminResponse } from '~/types/coreContent'

definePageMeta({ layout: 'admin' })
const api = useCoreContentAdmin()
const { data, pending, error, refresh } = await useFetch<PaginatedAdminResponse<AdminYearSummary>>('/api/admin/years', { default: () => ({ items: [], total: 0 }) })
const { data: fileData } = await useFetch<PaginatedAdminResponse<AdminFileResource>>('/api/admin/files', { default: () => ({ items: [], total: 0 }) })
const form = reactive({ academicYear: 114, title: '', theme: '', summary: '', highlightsText: '', statisticsText: '', coverAlt: '', reportFileId: '', sortOrder: 0 })
const editingId = ref('')
const coverFile = ref<File | null>(null)
const busy = ref(false)
const pageError = ref('')
const message = ref('')
const deleteTarget = ref<AdminYearSummary | null>(null)

const reset = () => {
  Object.assign(form, { academicYear: 114, title: '', theme: '', summary: '', highlightsText: '', statisticsText: '', coverAlt: '', reportFileId: '', sortOrder: 0 })
  editingId.value = ''
  coverFile.value = null
}
const edit = (item: AdminYearSummary) => {
  editingId.value = item.id
  Object.assign(form, {
    academicYear: item.academicYear, title: item.title, theme: item.theme, summary: item.summary,
    highlightsText: item.highlights.join('\n'), statisticsText: item.statistics.map(value => `${value.label}|${value.value}`).join('\n'),
    coverAlt: item.coverAlt, reportFileId: item.reportFileId ?? '', sortOrder: item.sortOrder
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const chooseCover = (event: Event) => { coverFile.value = (event.target as HTMLInputElement).files?.[0] ?? null }
const payload = () => ({
  academicYear: Number(form.academicYear), title: form.title, theme: form.theme, summary: form.summary,
  highlights: form.highlightsText.split('\n').map(value => value.trim()).filter(Boolean),
  statistics: form.statisticsText.split('\n').map(value => value.trim()).filter(Boolean).map((line) => {
    const [label, ...rest] = line.split('|')
    return { label: label?.trim() ?? '', value: rest.join('|').trim() }
  }),
  coverAlt: form.coverAlt, reportFileId: form.reportFileId || null, sortOrder: Number(form.sortOrder)
})
const uploadCover = async (id: string) => {
  if (!coverFile.value) return
  const body = new FormData()
  body.append('file', coverFile.value)
  body.append('altText', form.coverAlt)
  await api.upload(`/api/admin/years/${id}/cover`, body)
}
const submit = async () => {
  busy.value = true; pageError.value = ''; message.value = ''
  try {
    if (editingId.value) { await api.updateYear(editingId.value, payload()); await uploadCover(editingId.value) }
    else { const result = await api.createYear(payload()); await uploadCover(result.item.id) }
    message.value = editingId.value ? '年度成果已更新。' : '年度成果草稿已建立。'
    reset(); await refresh()
  } catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false }
}
const toggle = async (item: AdminYearSummary) => {
  busy.value = true; pageError.value = ''
  try { await api.mutate(`/api/admin/years/${item.id}/${item.status === 'draft' ? 'publish' : 'unpublish'}`); await refresh() }
  catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false }
}
const deleteCover = async (item: AdminYearSummary) => {
  busy.value = true; pageError.value = ''
  try { await api.mutate(`/api/admin/years/${item.id}/cover`, 'DELETE'); await refresh() }
  catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false }
}
const remove = async () => {
  if (!deleteTarget.value) return
  busy.value = true; pageError.value = ''
  try { await api.mutate(`/api/admin/years/${deleteTarget.value.id}`, 'DELETE'); deleteTarget.value = null; await refresh() }
  catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false }
}
</script>

<template><div class="grid gap-6">
  <div><p class="text-sm font-bold text-coral">Year summaries</p><h1 class="mt-1 text-3xl font-bold text-ink">年度成果管理</h1></div>
  <AdminFormSection :title="editingId ? '編輯年度成果' : '新增年度成果草稿'" description="年度採民國年；統計每行使用「標籤|數值」格式。">
    <form class="grid gap-4" @submit.prevent="submit"><p v-if="pageError" role="alert" class="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{{ pageError }}</p><p v-if="message" class="rounded-md bg-teal/10 p-3 text-sm font-semibold text-teal">{{ message }}</p>
      <div class="grid gap-4 md:grid-cols-2"><label class="grid gap-2 text-sm font-semibold">學年度<input v-model.number="form.academicYear" required type="number" min="90" max="200" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">標題<input v-model.trim="form.title" required maxlength="200" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">主題<input v-model.trim="form.theme" maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">排序<input v-model.number="form.sortOrder" type="number" min="0" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label></div>
      <label class="grid gap-2 text-sm font-semibold">摘要<textarea v-model.trim="form.summary" required maxlength="50000" class="focus-ring min-h-32 rounded-md border border-slate-200 p-3" /></label>
      <div class="grid gap-4 md:grid-cols-2"><label class="grid gap-2 text-sm font-semibold">亮點（每行一項）<textarea v-model="form.highlightsText" class="focus-ring min-h-32 rounded-md border border-slate-200 p-3" /></label><label class="grid gap-2 text-sm font-semibold">統計（每行「標籤|數值」）<textarea v-model="form.statisticsText" placeholder="參與人次|1,200" class="focus-ring min-h-32 rounded-md border border-slate-200 p-3" /></label></div>
      <div class="grid gap-4 md:grid-cols-2"><label class="grid gap-2 text-sm font-semibold">成果報告檔案<select v-model="form.reportFileId" class="focus-ring h-11 rounded-md border border-slate-200 px-3"><option value="">不連結</option><option v-for="file in fileData.items" :key="file.id" :value="file.id">{{ file.title }}（{{ file.status === 'published' ? '已發布' : '草稿' }}）</option></select></label><label class="grid gap-2 text-sm font-semibold">封面替代文字<input v-model.trim="form.coverAlt" maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">封面圖片（JPEG／PNG／WebP，最大 10 MB）<input type="file" accept="image/jpeg,image/png,image/webp" class="focus-ring rounded-md border border-slate-200 p-2" @change="chooseCover" /></label></div>
      <div class="flex justify-end gap-2"><button v-if="editingId" type="button" class="focus-ring rounded-md border px-4 py-2 font-bold" @click="reset">取消</button><button class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-bold text-white" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /><Plus v-else class="size-4" />{{ editingId ? '更新' : '建立草稿' }}</button></div>
    </form>
  </AdminFormSection>
  <CommonLoadingState v-if="pending" /><CommonEmptyState v-else-if="error" title="年度成果載入失敗" description="請重新整理頁面。" />
  <AdminDataTable v-else title="年度成果清單" :description="`共 ${data.total} 筆`"><thead class="bg-cloud text-left text-xs font-bold uppercase text-muted"><tr><th class="px-5 py-3">年度</th><th class="px-5 py-3">內容</th><th class="px-5 py-3">狀態</th><th class="px-5 py-3">操作</th></tr></thead><tbody class="divide-y divide-slate-200"><tr v-for="item in data.items" :key="item.id"><td class="px-5 py-4 text-2xl font-bold text-coral">{{ item.academicYear }}</td><td class="max-w-xl px-5 py-4"><p class="font-bold">{{ item.title }}</p><p class="text-sm text-muted">{{ item.theme }}</p><p class="mt-1 text-xs text-muted">{{ item.hasCover ? '已有封面' : '無封面' }} · {{ item.reportFileId ? '已連結報告' : '無報告' }}</p></td><td class="px-5 py-4"><AdminStatusBadge :status="item.status" /></td><td class="px-5 py-4"><div class="flex flex-wrap gap-2"><button class="focus-ring rounded-md border p-2" :aria-label="`編輯 ${item.title}`" @click="edit(item)"><Pencil class="size-4" /></button><button v-if="item.hasCover" class="focus-ring rounded-md border p-2" :disabled="busy" :aria-label="`移除 ${item.title} 封面`" @click="deleteCover(item)"><ImagePlus class="size-4" /></button><NuxtLink v-if="item.status === 'published'" :to="`/years/${item.academicYear}`" class="focus-ring rounded-md border px-3 py-2 text-sm font-bold">前台</NuxtLink><button class="focus-ring rounded-md bg-teal/10 px-3 py-2 text-sm font-bold text-teal" :disabled="busy" @click="toggle(item)">{{ item.status === 'draft' ? '發布' : '撤回' }}</button><button class="focus-ring rounded-md bg-red-50 p-2 text-red-700" :aria-label="`刪除 ${item.title}`" @click="deleteTarget = item"><Trash2 class="size-4" /></button></div></td></tr><tr v-if="!data.items.length"><td colspan="4" class="px-5 py-8 text-center text-muted">目前沒有年度成果。</td></tr></tbody></AdminDataTable>
  <AdminConfirmModal :open="Boolean(deleteTarget)" title="刪除年度成果" :message="`確定刪除「${deleteTarget?.title ?? ''}」及其封面嗎？`" confirm-label="刪除" :is-loading="busy" :error="pageError" @cancel="deleteTarget = null" @confirm="remove" />
</div></template>
