<script setup lang="ts">
import { mockPrograms } from '~/utils/mockData'

const program = mockPrograms.find((item) => item.slug === 'breakfast')!

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
        eyebrow="Breakfast"
        title="一份早餐打開一天的安心感"
        description="計畫固定於晨間進入合作據點，結合早餐、閱讀、短談與出席關懷。"
      />
      <div class="prose-content rounded-lg bg-white p-6 shadow-sm">
        <p>{{ program.description }}</p>
        <p>
          每一次排班都包含備餐、陪伴、紀錄與回報。志工會透過培訓學習界線、傾聽與回應方式，讓陪伴既溫暖也穩定。
        </p>
      </div>
    </div>
  </section>
</template>
