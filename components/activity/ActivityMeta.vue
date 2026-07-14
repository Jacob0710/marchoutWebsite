<script setup lang="ts">
import { Calendar, MapPin, UsersRound } from 'lucide-vue-next'

defineProps<{
  date: string
  location: string
  participants: number
}>()
</script>

<template>
  <dl class="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
    <div class="flex items-center gap-2">
      <Calendar class="size-4 text-coral" aria-hidden="true" />
      <dt class="sr-only">日期</dt>
      <dd>{{ formatDate(date) }}</dd>
    </div>
    <div class="flex items-center gap-2">
      <MapPin class="size-4 text-coral" aria-hidden="true" />
      <dt class="sr-only">地點</dt>
      <dd>{{ location }}</dd>
    </div>
    <div class="flex items-center gap-2">
      <UsersRound class="size-4 text-coral" aria-hidden="true" />
      <dt class="sr-only">人數</dt>
      <dd>{{ participants }} 人</dd>
    </div>
  </dl>
</template>
