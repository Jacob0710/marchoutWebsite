<script setup lang="ts">
useSeo({
  title: '組織架構',
  description: '了解愛潮關懷社的幹部組織、分工與年度傳承方式。'
})

const teams = [
  { name: '社長與副社長', duties: ['年度策略', '合作關係', '風險控管'] },
  { name: '服務企劃組', duties: ['需求訪談', '活動設計', '志工培力'] },
  { name: '活動執行組', duties: ['場務流程', '人力調度', '現場紀錄'] },
  { name: '影像與資料組', duties: ['照片整理', '成果報告', '檔案歸檔'] },
  { name: '行政財務組', duties: ['預算管理', '物資清冊', '合作文件'] }
]
</script>

<template>
  <CommonPageHero
    eyebrow="Organization"
    title="組織架構"
    description="清楚的分工讓服務能被準備、執行、回顧與傳承。"
    image-url="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=80"
  />

  <section class="section-y">
    <div class="page-shell">
      <CommonSectionTitle
        eyebrow="Team"
        title="幹部與組別分工"
        description="以任務為核心設計組別，每個組別都對應到服務流程中的一段責任。"
      />
      <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        <div v-for="team in teams" :key="team.name" class="rounded-lg bg-white p-5 shadow-sm">
          <h3 class="text-lg font-bold text-ink">{{ team.name }}</h3>
          <ul class="mt-4 grid gap-2 text-sm text-muted">
            <li v-for="duty in team.duties" :key="duty" class="rounded-md bg-cloud px-3 py-2">{{ duty }}</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="section-y bg-white">
    <div class="page-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <CommonSectionTitle
        eyebrow="Flow"
        title="年度運作流程"
        description="每學年從需求確認開始，到成果檔案整理結束，形成下一屆可參考的服務手冊。"
      />
      <div class="grid gap-4">
        <div
          v-for="(step, index) in ['合作需求確認', '志工招募與培訓', '活動執行與紀錄', '成果回顧與傳承']"
          :key="step"
          class="flex items-center gap-4 rounded-lg border border-slate-200 bg-paper p-5"
        >
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-coral font-bold text-white">
            {{ index + 1 }}
          </span>
          <h3 class="font-bold text-ink">{{ step }}</h3>
        </div>
      </div>
    </div>
  </section>
</template>
