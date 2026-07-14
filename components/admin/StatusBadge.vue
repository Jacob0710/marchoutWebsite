<script setup lang="ts">
import type { ContentStatus } from '~/types/content'

defineProps<{
  status: ContentStatus
}>()
</script>

<template>
  <span
    class="inline-flex rounded-md px-2.5 py-1 text-xs font-bold"
    :class="status === 'published' ? 'bg-teal/10 text-teal' : 'bg-honey/20 text-amber-700'"
  >
    {{ status === 'published' ? '已發布' : '草稿' }}
  </span>
</template>
