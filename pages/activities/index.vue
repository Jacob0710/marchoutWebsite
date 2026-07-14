<script setup lang="ts">
import type { ActivityType } from '~/types/content'

const { data: activities, error, pending } = await usePublicActivities()

const search = ref('')
const year = ref<number | 'all'>('all')
const type = ref<ActivityType | 'all'>('all')

const filteredActivities = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return activities.value.filter((activity) => {
    const matchesKeyword =
      !keyword ||
      [activity.title, activity.location, activity.resultSummary, ...activity.tags]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    const matchesYear = year.value === 'all' || activity.academicYear === year.value
    const matchesType = type.value === 'all' || activity.activityType === type.value

    return matchesKeyword && matchesYear && matchesType
  })
})

useSeo({
  title: '活動成果',
  description: '瀏覽愛潮關懷社活動成果，依年度、活動類型與關鍵字查找服務紀錄。',
  image: activities.value[0]?.coverImageUrl
})
</script>

<template>
  <CommonPageHero
    eyebrow="Activities"
    title="活動成果"
    description="整理每一次服務行動的現場、成果與可下載資料。"
    image-url="https://images.unsplash.com/photo-1527525443983-6e60c75fff46?auto=format&fit=crop&w=1800&q=80"
  />

  <section class="section-y">
    <div class="page-shell">
      <ActivityFilter
        v-model:search="search"
        v-model:year="year"
        v-model:type="type"
      />

      <CommonLoadingState v-if="pending" class="mt-8" />
      <CommonEmptyState
        v-else-if="error"
        class="mt-8"
        title="Unable to load activities"
        description="Please try again later."
      />
      <div v-else-if="filteredActivities.length" class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ActivityCard
          v-for="activity in filteredActivities"
          :key="activity.id"
          :activity="activity"
        />
      </div>
      <CommonEmptyState
        v-else
        class="mt-8"
        title="找不到符合條件的活動"
        description="請調整年度、類型或關鍵字後再試一次。"
      />
    </div>
  </section>
</template>
