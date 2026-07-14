<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="border-b border-slate-200 pb-4">
      <h2 class="text-lg font-bold text-ink">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-sm leading-6 text-muted">{{ description }}</p>
    </div>
    <div class="mt-5">
      <slot />
    </div>
  </section>
</template>
