<script setup lang="ts">
import type { ActivityImage } from '~/types/content'

defineProps<{
  images: ActivityImage[]
}>()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <figure v-for="image in images" :key="image.id" class="overflow-hidden rounded-lg bg-white shadow-sm">
      <img :src="image.imageUrl" :alt="image.caption" class="aspect-[4/3] w-full object-cover" />
      <figcaption class="px-4 py-3 text-sm text-muted">{{ image.caption }}</figcaption>
    </figure>
  </div>
</template>
