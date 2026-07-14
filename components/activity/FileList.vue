<script setup lang="ts">
import { Download } from 'lucide-vue-next'

defineProps<{
  files: string[]
}>()
</script>

<template>
  <div class="grid gap-3">
    <a
      v-for="file in files"
      :key="file"
      href="#"
      class="focus-ring flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-cloud"
    >
      {{ file }}
      <Download class="size-4 text-teal" aria-hidden="true" />
    </a>
  </div>
</template>
