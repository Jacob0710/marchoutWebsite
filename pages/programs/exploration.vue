<script setup lang="ts">
import { mockPrograms } from '~/utils/mockData'

const program = mockPrograms.find((item) => item.slug === 'exploration')!

useSeo({
  title: program.title,
  description: program.summary,
  image: program.imageUrl
})
</script>

<template>
  <CommonPageHero eyebrow="Program" :title="program.title" :description="program.summary" :image-url="program.imageUrl" />

  <section class="section-y">
    <div class="page-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
      <CommonSectionTitle
        eyebrow="Exploration"
        title="先理解城市，再設計行動"
        description="走讀不是散步，而是帶著問題、訪談與紀錄進入真實場域。"
      />
      <div class="prose-content rounded-lg bg-white p-6 shadow-sm">
        <p>{{ program.description }}</p>
        <p>
          參與者會整理觀察筆記、需求地圖與服務提案，練習把看見的問題轉成可討論、可修正、可實作的行動。
        </p>
      </div>
    </div>
  </section>
</template>
