<script setup lang="ts">
const { data: settingsData } = await usePublicSettings()
const settings = computed(() => settingsData.value?.item)

useSeo({
  title: '關於愛潮關懷社',
  description: '認識愛潮關懷社的成立理念、服務價值與青年培力方式。'
})

const values = [
  { title: '陪伴優先', text: '把人放在任務之前，以穩定出席建立信任。' },
  { title: '現場理解', text: '服務前先訪談、觀察與確認，不以想像代替需求。' },
  { title: '資料傳承', text: '把活動流程、成果與反思整理成可延續的知識。' },
  { title: '合作共好', text: '尊重學校、社福與地方夥伴的專業，一起設計可行方案。' }
]
</script>

<template>
  <CommonPageHero
    eyebrow="About"
    title="關於我們"
    :description="settings?.slogan || '認識愛潮關懷社的服務理念。'"
    image-url="https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1800&q=80"
  />

  <section class="section-y">
    <div class="page-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <CommonSectionTitle
        eyebrow="Story"
        title="從一群願意走出去的青年開始"
        description="March Out For Love 不是一句口號，而是一種服務態度：先理解，再行動；先陪伴，再談改變。"
      />
      <div class="prose-content rounded-lg bg-white p-6 shadow-sm">
        <p>
          愛潮關懷社長期關注兒少陪伴、社區支持與青年志工培力。我們相信關懷不只發生在大型活動裡，也發生在早餐桌邊、課後教室、社區走讀與每一次細緻的準備。
        </p>
        <p>
          社團透過組織分工、活動紀錄與反思制度，讓服務經驗能被接續。每一屆成員都能站在前人的整理上，繼續把更成熟的陪伴帶進現場。
        </p>
      </div>
    </div>
  </section>

  <section class="section-y bg-cloud">
    <div class="page-shell">
      <CommonSectionTitle eyebrow="Values" title="我們重視的事情" />
      <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div v-for="value in values" :key="value.title" class="rounded-lg bg-white p-6 shadow-sm">
          <h3 class="text-xl font-bold text-ink">{{ value.title }}</h3>
          <p class="mt-3 text-sm leading-6 text-muted">{{ value.text }}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section-y">
    <div class="page-shell grid gap-8 lg:grid-cols-2">
      <img
        src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1400&q=80"
        alt="學生志工一起討論活動"
        class="aspect-[4/3] rounded-lg object-cover shadow-soft"
      />
      <div class="grid content-center gap-6">
        <CommonSectionTitle
          eyebrow="Impact"
          title="把活動做成可以延續的服務"
          description="每一次活動結束後，我們會整理成果、檔案、照片與下一次改善方向，讓服務不是從零開始。"
        />
        <CommonBaseButton to="/years">查看年度成果</CommonBaseButton>
      </div>
    </div>
  </section>
</template>
