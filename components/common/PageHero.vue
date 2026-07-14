<script setup lang="ts">
interface Props {
  eyebrow?: string
  title: string
  description: string
  imageUrl?: string
}

defineProps<Props>()
</script>

<template>
  <section class="relative isolate overflow-hidden bg-ink text-white">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="title"
      class="absolute inset-0 -z-20 size-full object-cover"
    />
    <div class="absolute inset-0 -z-10 bg-ink/70" />
    <div class="page-shell flex min-h-[360px] items-end pb-14 pt-28 sm:min-h-[430px]">
      <div class="hero-in max-w-3xl">
        <p v-if="eyebrow" class="text-sm font-semibold uppercase tracking-[0.18em] text-honey">
          {{ eyebrow }}
        </p>
        <h1 class="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{{ title }}</h1>
        <p class="mt-5 max-w-2xl text-lg leading-8 text-slate-100">{{ description }}</p>
      </div>
    </div>
  </section>
</template>
