<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

const { faq } = useMockContent()
const activeId = ref(faq[0]?.id)

useSeo({
  title: 'FAQ',
  description: '愛潮關懷社常見問題：志工加入、活動參與、合作與檔案使用。'
})
</script>

<template>
  <CommonPageHero
    eyebrow="FAQ"
    title="常見問題"
    description="加入服務、合作洽詢與資料使用的常見回覆。"
    image-url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=80"
  />

  <section class="section-y">
    <div class="page-shell max-w-4xl">
      <div class="grid gap-3">
        <div v-for="item in faq" :key="item.id" class="overflow-hidden rounded-lg bg-white shadow-sm">
          <button
            type="button"
            class="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            @click="activeId = activeId === item.id ? '' : item.id"
          >
            <span class="font-bold text-ink">{{ item.question }}</span>
            <ChevronDown
              class="size-5 shrink-0 text-muted transition"
              :class="{ 'rotate-180': activeId === item.id }"
              aria-hidden="true"
            />
          </button>
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="-translate-y-2 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="-translate-y-2 opacity-0"
          >
            <div v-if="activeId === item.id" class="border-t border-slate-200 px-5 py-4 text-sm leading-7 text-muted">
              {{ item.answer }}
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </section>
</template>
