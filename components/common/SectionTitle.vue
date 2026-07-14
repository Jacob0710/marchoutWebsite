<script setup lang="ts">
interface Props {
  eyebrow?: string
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <div class="max-w-3xl">
    <p v-if="eyebrow" class="text-sm font-bold uppercase tracking-[0.18em] text-coral">{{ eyebrow }}</p>
    <h2 class="mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">{{ title }}</h2>
    <p v-if="description" class="mt-4 text-base leading-8 text-muted sm:text-lg">{{ description }}</p>
  </div>
</template>
