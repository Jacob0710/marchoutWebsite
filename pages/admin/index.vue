<script setup lang="ts">
import { ArrowRight, CalendarDays, ShieldCheck } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

const { user, status } = useAdminAuth()

useSeo({
  title: '管理後台',
  description: '愛潮關懷社管理後台。'
})
</script>

<template>
  <div class="grid gap-6">
    <section class="border-b border-slate-200 pb-6">
      <div class="flex items-start gap-4">
        <span class="grid size-11 shrink-0 place-items-center rounded-md bg-teal text-white">
          <ShieldCheck class="size-5" aria-hidden="true" />
        </span>
        <div>
          <p class="text-sm font-semibold text-muted">已通過伺服器端管理員驗證</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">管理後台</h2>
          <p class="mt-2 text-sm text-slate-600">{{ user?.email ?? '管理員' }}</p>
        </div>
      </div>
    </section>

    <CommonLoadingState v-if="status === 'pending'" />

    <p v-else-if="status === 'error'" class="rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      無法取得管理員資訊，請稍後再試。
    </p>

    <NuxtLink
      v-else
      to="/admin/activities"
      class="focus-ring flex max-w-2xl items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal"
    >
      <span class="flex min-w-0 items-center gap-4">
        <span class="grid size-10 shrink-0 place-items-center rounded-md bg-cloud text-teal">
          <CalendarDays class="size-5" aria-hidden="true" />
        </span>
        <span>
          <span class="block text-base font-bold text-ink">活動內容管理</span>
          <span class="mt-1 block text-sm text-muted">新增、編輯、發布活動，並管理圖片、附件與影片。</span>
        </span>
      </span>
      <ArrowRight class="size-5 shrink-0 text-muted" aria-hidden="true" />
    </NuxtLink>
  </div>
</template>
