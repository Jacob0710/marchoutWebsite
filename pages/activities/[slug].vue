<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data: activityResults, error, pending } = await usePublicActivityBySlug(slug)
const activity = computed(() => activityResults.value[0] ?? null)

if (error.value) {
  throw createError({ statusCode: 500, statusMessage: 'Unable to load activity' })
}

if (!activity.value) {
  throw createError({ statusCode: 404, statusMessage: 'Activity not found' })
}

const resolvedActivity = activity.value

useSeo({
  title: resolvedActivity.title,
  description: resolvedActivity.resultSummary,
  image: resolvedActivity.coverImageUrl
})
</script>

<template>
  <CommonLoadingState v-if="pending" class="section-y" />

  <CommonPageHero
    v-else-if="activity"
    eyebrow="Activity"
    :title="activity.title"
    :description="activity.resultSummary"
    :image-url="activity.coverImageUrl"
  />

  <section v-if="activity" class="section-y">
    <div class="page-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <article class="min-w-0">
        <div class="rounded-lg bg-white p-5 shadow-sm sm:p-7">
          <div class="flex flex-wrap gap-2">
            <span class="rounded-md bg-coral/10 px-3 py-1 text-sm font-bold text-coral">
              {{ activity.academicYear }} 學年度
            </span>
            <span class="rounded-md bg-teal/10 px-3 py-1 text-sm font-bold text-teal">
              {{ activityTypeLabels[activity.activityType] }}
            </span>
          </div>
          <ActivityMeta
            class="mt-6"
            :date="activity.eventDate"
            :location="activity.location"
            :participants="activity.participantsCount"
          />
          <div class="prose-content mt-8">
            <p>{{ activity.content }}</p>
            <p>{{ activity.resultSummary }}</p>
          </div>
        </div>

        <div class="mt-10">
          <CommonSectionTitle eyebrow="Gallery" title="活動照片" />
          <ActivityGallery class="mt-6" :images="activity.images" />
        </div>

        <div class="mt-10">
          <CommonSectionTitle eyebrow="Video" title="活動影片" />
          <ActivityYouTubeEmbed class="mt-6" :title="activity.title" :url="activity.videoUrl" />
        </div>
      </article>

      <aside class="grid content-start gap-6">
        <div class="rounded-lg bg-white p-5 shadow-sm">
          <h2 class="text-lg font-bold text-ink">活動標籤</h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="tag in activity.tags"
              :key="tag"
              class="rounded-md bg-cloud px-3 py-2 text-sm font-semibold text-slate-700"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div class="rounded-lg bg-white p-5 shadow-sm">
          <h2 class="text-lg font-bold text-ink">相關檔案</h2>
          <ActivityFileList class="mt-4" :files="activity.files" />
        </div>

        <CommonBaseButton to="/activities" variant="secondary">回活動列表</CommonBaseButton>
      </aside>
    </div>
  </section>
</template>
