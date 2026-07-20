<script setup lang="ts">
const route = useRoute()
const numericYear = computed(() => Number(route.params.year))
const { data, error } = await usePublicYear(numericYear)
if (error.value || !data.value?.item) throw createError({ statusCode: 404, statusMessage: 'Year not found' })
const year = computed(() => data.value!.item)
useSeo({ title: `${year.value.academicYear} 學年度成果`, description: year.value.summary, image: year.value.coverUrl ?? undefined })
</script>
<template>
  <CommonPageHero eyebrow="Year Review" :title="`${year.academicYear} 學年度｜${year.title}`" :description="year.summary" :image-url="year.coverUrl || undefined" />
  <section class="section-y"><div class="page-shell grid gap-8 lg:grid-cols-[1fr_0.75fr]">
    <div class="rounded-lg bg-white p-6 shadow-sm"><h2 class="text-2xl font-bold text-ink">年度重點</h2><ul class="mt-5 grid gap-3 text-muted"><li v-for="item in year.highlights" :key="item" class="rounded-md bg-cloud px-4 py-3">{{ item }}</li></ul></div>
    <div class="grid content-start gap-4"><div v-for="item in year.statistics" :key="item.label" class="rounded-lg bg-ink p-5 text-white"><p class="text-3xl font-bold text-honey">{{ item.value }}</p><p class="mt-2 text-sm">{{ item.label }}</p></div><a v-if="year.reportFile" :href="year.reportFile.downloadUrl" class="focus-ring rounded-md bg-coral px-5 py-3 text-center font-bold text-white">下載年度報告</a></div>
  </div></section>
</template>
