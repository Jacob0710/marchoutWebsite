<script setup lang="ts">
const { programs } = useMockContent()

useSeo({
  title: '服務計畫',
  description: '愛潮關懷社三大服務主軸：愛心早餐陪伴、關懷服務行動與城市探索走讀。'
})
</script>

<template>
  <CommonPageHero
    eyebrow="Programs"
    title="服務計畫"
    description="用清楚的計畫設計，讓青年志工能穩定投入，也讓合作單位知道每一次行動能帶來什麼。"
    image-url="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1800&q=80"
  />

  <section class="section-y">
    <div class="page-shell grid gap-8">
      <article
        v-for="program in programs"
        :key="program.id"
        class="grid gap-6 rounded-lg bg-white p-5 shadow-sm lg:grid-cols-[0.9fr_1.1fr] lg:p-6"
      >
        <img :src="program.imageUrl" :alt="program.title" class="aspect-[4/3] w-full rounded-lg object-cover" />
        <div class="grid content-center gap-5">
          <div>
            <p class="text-sm font-bold uppercase tracking-[0.18em] text-coral">{{ program.slug }}</p>
            <h2 class="mt-2 text-3xl font-bold text-ink">{{ program.title }}</h2>
            <p class="mt-4 leading-8 text-muted">{{ program.description }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="item in program.highlights"
              :key="item"
              class="rounded-md bg-cloud px-3 py-2 text-sm font-semibold text-slate-700"
            >
              {{ item }}
            </span>
          </div>
          <CommonBaseButton
            v-if="program.slug === 'breakfast' || program.slug === 'exploration'"
            :to="`/programs/${program.slug}`"
          >
            深入了解
          </CommonBaseButton>
        </div>
      </article>
    </div>
  </section>
</template>
