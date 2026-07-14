<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import { academicYears } from '~/utils/mockData'

const { files } = useMockContent()
const search = ref('')
const year = ref<number | 'all'>('all')
const category = ref('all')

const categories = computed(() => [
  { label: '全部分類', value: 'all' },
  ...Array.from(new Set(files.map((file) => file.category))).map((item) => ({ label: item, value: item }))
])

const filteredFiles = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return files.filter((file) => {
    const matchesKeyword =
      !keyword || [file.title, file.description, file.category, file.fileType].join(' ').toLowerCase().includes(keyword)
    const matchesYear = year.value === 'all' || file.academicYear === year.value
    const matchesCategory = category.value === 'all' || file.category === category.value
    return matchesKeyword && matchesYear && matchesCategory
  })
})

useSeo({
  title: '檔案下載',
  description: '下載愛潮關懷社年度成果報告、活動手冊與行政表單。'
})
</script>

<template>
  <CommonPageHero
    eyebrow="Files"
    title="檔案下載"
    description="集中整理成果報告、活動手冊、提案集與行政表單。"
    image-url="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1800&q=80"
  />

  <section class="section-y">
    <div class="page-shell">
      <div class="grid gap-4 rounded-lg bg-white p-4 shadow-sm">
        <CommonSearchInput v-model="search" placeholder="搜尋檔案" />
        <CommonYearTabs v-model="year" :years="academicYears" />
        <CommonCategoryTabs v-model="category" :items="categories" />
      </div>

      <div v-if="filteredFiles.length" class="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          class="grid gap-4 border-b border-slate-200 p-5 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div>
            <div class="flex flex-wrap gap-2">
              <span class="rounded-md bg-cloud px-2.5 py-1 text-xs font-bold text-slate-700">{{ file.fileType }}</span>
              <span class="rounded-md bg-teal/10 px-2.5 py-1 text-xs font-bold text-teal">{{ file.category }}</span>
              <span v-if="file.academicYear" class="rounded-md bg-coral/10 px-2.5 py-1 text-xs font-bold text-coral">
                {{ file.academicYear }} 學年
              </span>
            </div>
            <h2 class="mt-3 text-xl font-bold text-ink">{{ file.title }}</h2>
            <p class="mt-2 text-sm leading-6 text-muted">{{ file.description }}</p>
          </div>
          <a
            :href="file.fileUrl"
            class="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-teal"
          >
            <Download class="size-4" aria-hidden="true" />
            下載
          </a>
        </div>
      </div>
      <CommonEmptyState v-else class="mt-8" title="沒有符合的檔案" description="請調整年度、分類或關鍵字後再試一次。" />
    </div>
  </section>
</template>
