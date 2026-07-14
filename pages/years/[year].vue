<script setup lang="ts">
const route = useRoute()
const { activities, getYear } = useMockContent()
const numericYear = Number(route.params.year)
const year = computed(() => getYear(numericYear))
const yearActivities = computed(() => activities.filter((activity) => activity.academicYear === numericYear))

if (!year.value) {
  throw createError({ statusCode: 404, statusMessage: 'Year not found' })
}

useSeo({
  title: `${numericYear} 學年度成果`,
  description: year.value.summary,
  image: year.value.coverImageUrl
})
</script>

<template>
  <CommonPageHero
    v-if="year"
    eyebrow="Year"
    :title="`${year.year} 學年度成果`"
    :description="year.summary"
    :image-url="year.coverImageUrl"
  />

  <section v-if="year" class="section-y">
    <div class="page-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
      <aside class="rounded-lg bg-white p-6 shadow-sm">
        <h2 class="text-2xl font-bold text-ink">{{ year.theme }}</h2>
        <ul class="mt-5 grid gap-3">
          <li v-for="highlight in year.highlights" :key="highlight" class="rounded-md bg-cloud px-4 py-3 text-sm font-semibold text-slate-700">
            {{ highlight }}
          </li>
        </ul>
        <CommonBaseButton to="/files" class="mt-6" variant="secondary">查看報告檔案</CommonBaseButton>
      </aside>

      <div>
        <CommonSectionTitle eyebrow="Activities" title="年度活動" />
        <div v-if="yearActivities.length" class="mt-6 grid gap-6 md:grid-cols-2">
          <ActivityCard v-for="activity in yearActivities" :key="activity.id" :activity="activity" />
        </div>
        <CommonEmptyState
          v-else
          class="mt-6"
          title="尚無活動資料"
          description="這個年度的活動資料仍在整理中。"
        />
      </div>
    </div>
  </section>
</template>
