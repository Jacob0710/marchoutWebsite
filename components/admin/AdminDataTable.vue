<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-bold text-ink">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
      </div>
      <slot name="actions" />
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <slot />
      </table>
    </div>
  </section>
</template>
