<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import type { ActivityFile } from '~/types/content'

defineProps<{
  files: Array<ActivityFile | string>
}>()

const fileName = (file: ActivityFile | string) => typeof file === 'string' ? file : file.name
const fileUrl = (file: ActivityFile | string) => typeof file === 'string' ? '#' : file.url
const fileKey = (file: ActivityFile | string) => typeof file === 'string' ? file : file.id
</script>

<template>
  <div class="grid gap-3">
    <a
      v-for="file in files"
      :key="fileKey(file)"
      :href="fileUrl(file)"
      class="focus-ring flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-cloud"
    >
      {{ fileName(file) }}
      <Download class="size-4 text-teal" aria-hidden="true" />
    </a>
  </div>
</template>
