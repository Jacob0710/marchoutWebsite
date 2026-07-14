<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <Inbox class="mx-auto size-10 text-muted" aria-hidden="true" />
    <h3 class="mt-4 text-lg font-bold text-ink">{{ title }}</h3>
    <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{{ description }}</p>
  </div>
</template>
