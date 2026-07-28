<script setup lang="ts">
import { ClipboardCheck, RefreshCw, Search } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })
useSeo({ title: 'Editorial review queue', description: 'Phase 10 內容、隱私與 redirect 審核佇列。' })

const state = ref('all')
const severity = ref('all')
const targetKind = ref('all')
const q = ref('')
const offset = ref(0)
const { data, pending, error, refresh } = await useEditorialQueue({ state, severity, targetKind, q, offset })
const page = computed(() => Math.floor(offset.value / 50) + 1)
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / 50)))
watch([state, severity, targetKind, q], () => { offset.value = 0 })

const severityLabel = (value: string) => ({ high: '高', medium: '中', low: '低' }[value] ?? value)
const stateLabel = (value: string) => ({ pending: '待審', 'in-review': '審核中', resolved: '已完成', deferred: '延後' }[value] ?? value)
const kindLabel = (value: string) => ({ activity: '活動', file: '檔案', 'year-summary': '年度', redirect: 'Redirect' }[value] ?? value)
</script>

<template>
  <div class="grid gap-6">
    <header class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
      <div class="flex items-start gap-4">
        <span class="grid size-11 shrink-0 place-items-center rounded-md bg-teal text-white"><ClipboardCheck class="size-5" aria-hidden="true" /></span>
        <div><h1 class="text-2xl font-bold text-ink">Editorial review queue</h1><p class="mt-2 max-w-3xl text-sm leading-6 text-muted">唯一涵蓋 122 筆 Phase 9 審核的工作佇列。發布與 redirect 啟用必須由這裡的逐筆證據解鎖。</p></div>
      </div>
      <button type="button" class="focus-ring inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-bold" :disabled="pending" @click="refresh()"><RefreshCw class="size-4" :class="{ 'animate-spin': pending }" />重新整理</button>
    </header>

    <section v-if="data" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="審核摘要">
      <div class="rounded-lg border bg-white p-4"><p class="text-xs font-bold text-muted">全部 reviews</p><p class="mt-1 text-2xl font-bold">{{ data.reconciliation.reviews.total }}</p></div>
      <div class="rounded-lg border bg-white p-4"><p class="text-xs font-bold text-muted">待審／審核中</p><p class="mt-1 text-2xl font-bold">{{ data.reconciliation.reviews.pending + data.reconciliation.reviews.inReview }}</p></div>
      <div class="rounded-lg border bg-white p-4"><p class="text-xs font-bold text-muted">High 未決</p><p class="mt-1 text-2xl font-bold text-red-700">{{ data.reconciliation.reviews.highRemaining }}</p></div>
      <div class="rounded-lg border bg-white p-4"><p class="text-xs font-bold text-muted">70 targets 未決</p><p class="mt-1 text-2xl font-bold">{{ data.reconciliation.targets.pending }}</p></div>
      <div class="rounded-lg border bg-white p-4"><p class="text-xs font-bold text-muted">83 redirects 未決</p><p class="mt-1 text-2xl font-bold">{{ data.reconciliation.redirects.pending }}</p></div>
    </section>

    <section class="grid gap-4 rounded-lg border bg-white p-5" aria-label="篩選審核佇列">
      <div class="grid gap-4 md:grid-cols-4">
        <label class="grid gap-2 text-sm font-bold">狀態<select v-model="state" class="focus-ring h-11 rounded-md border px-3"><option value="all">全部</option><option value="pending">待審</option><option value="in-review">審核中</option><option value="resolved">已完成</option><option value="deferred">延後</option></select></label>
        <label class="grid gap-2 text-sm font-bold">嚴重度<select v-model="severity" class="focus-ring h-11 rounded-md border px-3"><option value="all">全部</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
        <label class="grid gap-2 text-sm font-bold">類型<select v-model="targetKind" class="focus-ring h-11 rounded-md border px-3"><option value="all">全部</option><option value="activity">活動</option><option value="file">檔案</option><option value="year-summary">年度</option><option value="redirect">Redirect</option></select></label>
        <label class="grid gap-2 text-sm font-bold">搜尋<span class="relative"><Search class="absolute left-3 top-3 size-4 text-muted" aria-hidden="true" /><input v-model.trim="q" maxlength="200" class="focus-ring h-11 w-full rounded-md border pl-10 pr-3" placeholder="Review ID、來源或標題" /></span></label>
      </div>
    </section>

    <CommonLoadingState v-if="pending && !data" />
    <section v-else-if="error" role="alert" class="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">Editorial schema 尚未部署或資料暫時無法載入；未解決前所有發布保持封鎖。</section>
    <AdminDataTable v-else title="審核項目" :description="`符合條件 ${data?.total ?? 0} 筆；第 ${page} / ${pages} 頁`">
      <thead class="bg-cloud text-left text-xs font-bold uppercase text-muted"><tr><th class="px-5 py-3">Review</th><th class="px-5 py-3">目標</th><th class="px-5 py-3">Issue</th><th class="px-5 py-3">狀態</th><th class="px-5 py-3">操作</th></tr></thead>
      <tbody class="divide-y divide-slate-200"><tr v-for="item in data?.items" :key="item.reviewKey">
        <td class="px-5 py-4"><p class="font-mono text-xs font-bold">{{ item.reviewKey }}</p><span class="mt-1 inline-flex rounded px-2 py-0.5 text-xs font-bold" :class="item.severity === 'high' ? 'bg-red-50 text-red-700' : item.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'">{{ severityLabel(item.severity) }}</span></td>
        <td class="max-w-sm px-5 py-4"><p class="font-bold">{{ item.targetTitle }}</p><p class="mt-1 text-xs text-muted">{{ kindLabel(item.targetKind) }} · {{ item.targetStatus }}</p><p v-if="item.privacyState === 'redaction-required'" class="mt-1 text-xs font-bold text-red-700">需要不可還原的遮蔽副本</p></td>
        <td class="max-w-xs px-5 py-4"><p class="break-words text-sm">{{ item.issueCode }}</p></td>
        <td class="px-5 py-4"><span class="rounded bg-slate-100 px-2 py-1 text-xs font-bold">{{ stateLabel(item.state) }}</span></td>
        <td class="px-5 py-4"><NuxtLink :to="`/admin/editorial/${item.reviewKey}`" class="focus-ring inline-flex rounded-md bg-ink px-3 py-2 text-sm font-bold text-white">逐筆審核</NuxtLink></td>
      </tr><tr v-if="!data?.items.length"><td colspan="5" class="px-5 py-10 text-center text-muted">目前沒有符合條件的審核。</td></tr></tbody>
      <template #actions><div class="flex gap-2"><button type="button" class="focus-ring rounded-md border px-3 py-2 text-sm font-bold disabled:opacity-50" :disabled="offset === 0" @click="offset = Math.max(0, offset - 50)">上一頁</button><button type="button" class="focus-ring rounded-md border px-3 py-2 text-sm font-bold disabled:opacity-50" :disabled="page >= pages" @click="offset += 50">下一頁</button></div></template>
    </AdminDataTable>
  </div>
</template>
