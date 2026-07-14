<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import type { Activity } from '~/types/content'
import { activityTypeLabels } from '~/utils/mockData'

defineProps<{
  activity: Activity
}>()
</script>

<template>
  <CommonBaseCard>
    <NuxtLink :to="`/activities/${activity.slug}`" class="group block">
      <div class="relative aspect-[4/3] overflow-hidden">
        <img
          :src="activity.coverImageUrl"
          :alt="activity.title"
          class="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div class="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-1 text-xs font-bold text-ink">
          {{ activity.academicYear }} 學年
        </div>
      </div>
      <div class="p-5">
        <div class="flex items-center justify-between gap-4">
          <span class="rounded-md bg-teal/10 px-2.5 py-1 text-xs font-bold text-teal">
            {{ activityTypeLabels[activity.activityType] }}
          </span>
          <ArrowUpRight class="size-4 text-muted transition group-hover:text-coral" aria-hidden="true" />
        </div>
        <h3 class="mt-4 text-xl font-bold leading-snug text-ink">{{ activity.title }}</h3>
        <p class="mt-3 line-clamp-3 text-sm leading-6 text-muted">{{ activity.resultSummary }}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tag in activity.tags.slice(0, 3)"
            :key="tag"
            class="rounded-md bg-cloud px-2 py-1 text-xs font-semibold text-slate-600"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </NuxtLink>
  </CommonBaseCard>
</template>
