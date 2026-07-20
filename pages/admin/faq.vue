<script setup lang="ts">
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import type { CoreFaqItem } from '~/types/coreContent'

definePageMeta({ layout: 'admin' })

const api = useCoreContentAdmin()
const { data, pending, error, refresh } = await useFetch<{ items: CoreFaqItem[] }>('/api/admin/faq', {
  default: () => ({ items: [] })
})
const form = reactive({ question: '', answer: '', isActive: true })
const editingId = ref('')
const busy = ref(false)
const pageError = ref('')
const message = ref('')
const deleteTarget = ref<CoreFaqItem | null>(null)

const reset = () => {
  Object.assign(form, { question: '', answer: '', isActive: true })
  editingId.value = ''
}

const edit = (item: CoreFaqItem) => {
  editingId.value = item.id
  Object.assign(form, { question: item.question, answer: item.answer, isActive: item.isActive })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const submit = async () => {
  busy.value = true
  pageError.value = ''
  message.value = ''
  try {
    if (editingId.value) await api.updateFaq(editingId.value, form)
    else await api.createFaq({ ...form, sortOrder: data.value.items.length })
    message.value = editingId.value ? 'FAQ 已更新。' : 'FAQ 已建立。'
    reset()
    await refresh()
  } catch (reason) {
    pageError.value = api.errorMessage(reason)
  } finally {
    busy.value = false
  }
}

const move = async (index: number, direction: -1 | 1) => {
  const target = index + direction
  if (target < 0 || target >= data.value.items.length) return
  const previous = [...data.value.items]
  const reordered = [...previous]
  const [moved] = reordered.splice(index, 1)
  if (!moved) return
  reordered.splice(target, 0, moved)
  data.value.items = reordered.map((item, sortOrder) => ({ ...item, sortOrder }))
  busy.value = true
  pageError.value = ''
  try {
    const result = await api.reorderFaq(reordered.map(item => item.id))
    data.value.items = result.items
  } catch (reason) {
    data.value.items = previous
    pageError.value = `排序未儲存：${api.errorMessage(reason)}`
  } finally {
    busy.value = false
  }
}

const toggle = async (item: CoreFaqItem) => {
  busy.value = true
  pageError.value = ''
  try {
    await api.updateFaq(item.id, { isActive: !item.isActive })
    await refresh()
  } catch (reason) {
    pageError.value = api.errorMessage(reason)
  } finally {
    busy.value = false
  }
}

const remove = async () => {
  if (!deleteTarget.value) return
  busy.value = true
  pageError.value = ''
  try {
    await api.mutate(`/api/admin/faq/${deleteTarget.value.id}`, 'DELETE')
    deleteTarget.value = null
    await refresh()
  } catch (reason) {
    pageError.value = api.errorMessage(reason)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid gap-6">
    <div><p class="text-sm font-bold text-coral">FAQ</p><h1 class="mt-1 text-3xl font-bold text-ink">常見問題管理</h1></div>
    <AdminFormSection :title="editingId ? '編輯 FAQ' : '新增 FAQ'" description="問題可停用而不必刪除；列表排序會以單一資料庫操作儲存。">
      <form class="grid gap-4" @submit.prevent="submit">
        <p v-if="pageError" role="alert" class="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{{ pageError }}</p>
        <p v-if="message" class="rounded-md bg-teal/10 p-3 text-sm font-semibold text-teal">{{ message }}</p>
        <label class="grid gap-2 text-sm font-semibold">問題<input v-model.trim="form.question" required minlength="4" maxlength="500" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label>
        <label class="grid gap-2 text-sm font-semibold">回答<textarea v-model.trim="form.answer" required minlength="8" maxlength="10000" class="focus-ring min-h-32 rounded-md border border-slate-200 p-3" /></label>
        <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.isActive" type="checkbox" class="size-4" /> 啟用並顯示於前台</label>
        <div class="flex justify-end gap-2"><button v-if="editingId" type="button" class="focus-ring rounded-md border px-4 py-2 font-bold" @click="reset">取消</button><button type="submit" class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-bold text-white" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /><Plus v-else class="size-4" />{{ editingId ? '更新' : '建立' }}</button></div>
      </form>
    </AdminFormSection>

    <CommonLoadingState v-if="pending" />
    <CommonEmptyState v-else-if="error" title="FAQ 載入失敗" description="請重新整理頁面。" />
    <AdminDataTable v-else title="FAQ 清單" :description="`共 ${data.items.length} 筆；上下按鈕支援鍵盤操作。`">
      <thead class="bg-cloud text-left text-xs font-bold uppercase text-muted"><tr><th class="px-5 py-3">排序</th><th class="px-5 py-3">內容</th><th class="px-5 py-3">狀態</th><th class="px-5 py-3">操作</th></tr></thead>
      <tbody class="divide-y divide-slate-200">
        <tr v-for="(item, index) in data.items" :key="item.id">
          <td class="px-5 py-4"><div class="flex gap-1"><button type="button" class="focus-ring rounded-md border p-2 disabled:opacity-30" :disabled="busy || index === 0" :aria-label="`將「${item.question}」上移`" @click="move(index, -1)"><ArrowUp class="size-4" /></button><button type="button" class="focus-ring rounded-md border p-2 disabled:opacity-30" :disabled="busy || index === data.items.length - 1" :aria-label="`將「${item.question}」下移`" @click="move(index, 1)"><ArrowDown class="size-4" /></button></div></td>
          <td class="max-w-2xl px-5 py-4"><p class="font-bold text-ink">{{ item.question }}</p><p class="mt-1 whitespace-pre-line text-sm leading-6 text-muted">{{ item.answer }}</p></td>
          <td class="px-5 py-4"><button type="button" class="focus-ring rounded-md px-3 py-2 text-sm font-bold" :class="item.isActive ? 'bg-teal/10 text-teal' : 'bg-slate-100 text-muted'" :disabled="busy" @click="toggle(item)">{{ item.isActive ? '啟用中' : '已停用' }}</button></td>
          <td class="px-5 py-4"><div class="flex gap-2"><button type="button" class="focus-ring rounded-md border p-2" :aria-label="`編輯 ${item.question}`" @click="edit(item)"><Pencil class="size-4" /></button><button type="button" class="focus-ring rounded-md bg-red-50 p-2 text-red-700" :aria-label="`刪除 ${item.question}`" @click="deleteTarget = item"><Trash2 class="size-4" /></button></div></td>
        </tr>
        <tr v-if="!data.items.length"><td colspan="4" class="px-5 py-8 text-center text-muted">目前沒有 FAQ。</td></tr>
      </tbody>
    </AdminDataTable>
    <AdminConfirmModal :open="Boolean(deleteTarget)" title="刪除 FAQ" :message="`確定刪除「${deleteTarget?.question ?? ''}」嗎？`" confirm-label="刪除" :is-loading="busy" :error="pageError" @cancel="deleteTarget = null" @confirm="remove" />
  </div>
</template>
