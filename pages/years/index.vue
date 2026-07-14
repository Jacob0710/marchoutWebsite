<script setup lang="ts">
const { years } = useMockContent()

useSeo({
  title: '年度成果',
  description: '瀏覽愛潮關懷社 109 至 114 學年度成果資料。'
})
</script>

<template>
  <CommonPageHero
    eyebrow="Years"
    title="年度成果"
    description="把每一年的服務主題、活動紀錄與成果報告整理成可查找的資料庫。"
    image-url="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1800&q=80"
  />

  <section class="section-y">
    <div class="page-shell grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="year in years"
        :key="year.year"
        :to="`/years/${year.year}`"
        class="focus-ring group overflow-hidden rounded-lg bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
      >
        <img :src="year.coverImageUrl" :alt="`${year.year} 學年度`" class="aspect-[4/3] w-full object-cover" />
        <div class="p-5">
          <p class="text-4xl font-bold text-coral">{{ year.year }}</p>
          <h2 class="mt-3 text-xl font-bold text-ink">{{ year.theme }}</h2>
          <p class="mt-3 text-sm leading-6 text-muted">{{ year.summary }}</p>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
