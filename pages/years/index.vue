<script setup lang="ts">
const { data, pending, error } = await usePublicYears()
const years = computed(() => data.value?.items ?? [])
useSeo({ title: '年度成果', description: '瀏覽愛潮關懷社歷年成果資料。' })
</script>
<template>
  <CommonPageHero eyebrow="Years" title="年度成果" description="把每一年的服務主題、活動紀錄與成果報告整理成可查找的資料庫。" image-url="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1800&q=80" />
  <section class="section-y"><div class="page-shell">
    <CommonLoadingState v-if="pending" />
    <CommonEmptyState v-else-if="error" title="年度成果暫時無法載入" description="請稍後重新整理頁面。" />
    <div v-else-if="years.length" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="year in years" :key="year.id" :to="`/years/${year.academicYear}`" class="focus-ring group overflow-hidden rounded-lg bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
        <img v-if="year.coverUrl" :src="year.coverUrl" :alt="year.coverAlt" class="aspect-[4/3] w-full object-cover" /><div v-else class="grid aspect-[4/3] place-items-center bg-cloud text-5xl font-bold text-coral">{{ year.academicYear }}</div>
        <div class="p-5"><p class="text-4xl font-bold text-coral">{{ year.academicYear }}</p><h2 class="mt-3 text-xl font-bold text-ink">{{ year.title }}</h2><p class="mt-3 text-sm leading-6 text-muted">{{ year.summary }}</p></div>
      </NuxtLink>
    </div>
    <CommonEmptyState v-else title="目前沒有年度成果" description="成果發布後會顯示在這裡。" />
  </div></section>
</template>
