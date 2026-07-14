<script setup lang="ts">
defineProps<{
  url?: string
  title: string
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg bg-ink shadow-soft">
    <iframe
      v-if="url"
      class="aspect-video w-full"
      :src="url"
      :title="title"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    />
    <div v-else class="grid aspect-video place-items-center px-6 text-center text-white">
      <p class="max-w-md text-sm leading-6 text-slate-300">活動影片整理中</p>
    </div>
  </div>
</template>
