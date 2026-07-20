<script setup lang="ts">
import { Plus, Search, Trash2 } from 'lucide-vue-next'
import type { AdminPost, PaginatedAdminResponse } from '~/types/coreContent'
definePageMeta({ layout: 'admin' })
const status = ref('all')
const search = ref('')
const api = useCoreContentAdmin()
const { data, pending, error, refresh } = await useFetch<PaginatedAdminResponse<AdminPost>>('/api/admin/posts', { query: { status, search }, default: () => ({ items: [], total: 0 }) })
const target = ref<AdminPost | null>(null)
const actionPending = ref(false)
const actionError = ref('')
const changeStatus = async (item: AdminPost) => { actionPending.value = true; actionError.value = ''; try { await api.mutate(`/api/admin/posts/${item.id}/${item.status === 'draft' ? 'publish' : 'unpublish'}`); await refresh() } catch (reason) { actionError.value = api.errorMessage(reason) } finally { actionPending.value = false } }
const remove = async () => { if (!target.value) return; actionPending.value = true; try { await api.mutate(`/api/admin/posts/${target.value.id}`, 'DELETE'); target.value = null; await refresh() } catch (reason) { actionError.value = api.errorMessage(reason) } finally { actionPending.value = false } }
</script>
<template><div class="grid gap-6">
  <div class="flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm font-bold text-coral">Posts</p><h1 class="mt-1 text-3xl font-bold text-ink">最新消息</h1></div><CommonBaseButton to="/admin/posts/create"><Plus class="size-4" />新增消息</CommonBaseButton></div>
  <div class="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px]"><label class="relative"><span class="sr-only">搜尋消息</span><Search class="absolute left-3 top-3.5 size-4 text-muted" /><input v-model="search" class="focus-ring h-11 w-full rounded-md border border-slate-200 pl-10 pr-3" placeholder="搜尋標題或 slug" /></label><label><span class="sr-only">狀態</span><select v-model="status" class="focus-ring h-11 w-full rounded-md border border-slate-200 px-3"><option value="all">全部狀態</option><option value="draft">草稿</option><option value="published">已發布</option></select></label></div>
  <p v-if="actionError" role="alert" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ actionError }}</p>
  <CommonLoadingState v-if="pending" />
  <CommonEmptyState v-else-if="error" title="消息載入失敗" description="請重新整理頁面。" />
  <AdminDataTable v-else title="消息清單" :description="`共 ${data?.total ?? 0} 筆`"><thead class="bg-cloud text-left text-xs font-bold uppercase text-muted"><tr><th class="px-5 py-3">標題</th><th class="px-5 py-3">狀態</th><th class="px-5 py-3">更新</th><th class="px-5 py-3">操作</th></tr></thead><tbody class="divide-y divide-slate-200"><tr v-for="item in data?.items" :key="item.id"><td class="px-5 py-4"><p class="font-bold text-ink">{{ item.title }}</p><p class="text-xs text-muted">{{ item.slug }}</p></td><td class="px-5 py-4"><AdminStatusBadge :status="item.status" /></td><td class="px-5 py-4 text-sm text-muted">{{ formatDate(item.updatedAt) }}</td><td class="px-5 py-4"><div class="flex flex-wrap gap-2"><NuxtLink :to="`/admin/posts/edit/${item.id}`" class="focus-ring rounded-md border px-3 py-2 text-sm font-bold">編輯</NuxtLink><button class="focus-ring rounded-md bg-teal/10 px-3 py-2 text-sm font-bold text-teal" :disabled="actionPending" @click="changeStatus(item)">{{ item.status === 'draft' ? '發布' : '撤回' }}</button><button class="focus-ring rounded-md bg-red-50 px-3 py-2 text-red-700" aria-label="刪除消息" @click="target = item"><Trash2 class="size-4" /></button></div></td></tr><tr v-if="!data?.items.length"><td colspan="4" class="px-5 py-8 text-center text-muted">目前沒有消息。</td></tr></tbody></AdminDataTable>
  <AdminConfirmModal :open="Boolean(target)" title="刪除消息" :message="`確定刪除「${target?.title ?? ''}」及其封面嗎？`" confirm-label="刪除" :is-loading="actionPending" :error="actionError" @cancel="target = null" @confirm="remove" />
</div></template>
