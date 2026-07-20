<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
const { data, pending, error } = await usePublicFaq()
const faq = computed(() => data.value?.items ?? [])
const activeId = ref('')
useSeo({ title: 'FAQ', description: '愛潮關懷社常見問題：志工加入、活動參與、合作與檔案使用。' })
</script>

<template>
  <CommonPageHero eyebrow="FAQ" title="常見問題" description="加入服務、合作洽詢與資料使用的常見回覆。" image-url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=80" />
  <section class="section-y"><div class="page-shell max-w-4xl">
    <CommonLoadingState v-if="pending" />
    <CommonEmptyState v-else-if="error" title="FAQ 暫時無法載入" description="請稍後重新整理頁面。" />
    <div v-else-if="faq.length" class="grid gap-3">
      <div v-for="item in faq" :key="item.id" class="overflow-hidden rounded-lg bg-white shadow-sm">
        <h2><button type="button" class="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left" :aria-expanded="activeId === item.id" :aria-controls="`faq-answer-${item.id}`" @click="activeId = activeId === item.id ? '' : item.id"><span class="font-bold text-ink">{{ item.question }}</span><ChevronDown class="size-5 shrink-0 text-muted transition" :class="{ 'rotate-180': activeId === item.id }" aria-hidden="true" /></button></h2>
        <div v-show="activeId === item.id" :id="`faq-answer-${item.id}`" class="border-t border-slate-200 px-5 py-4 text-sm leading-7 text-muted">{{ item.answer }}</div>
      </div>
    </div>
    <CommonEmptyState v-else title="目前沒有常見問題" description="內容整理完成後會顯示在這裡。" />
  </div></section>
</template>
