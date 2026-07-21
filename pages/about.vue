<script setup lang="ts">
const { data: settingsData } = await usePublicSettings()
const settings = computed(() => settingsData.value?.item)

useSeo({
  title: '關於愛潮關懷社',
  description: '愛潮關懷社的起源、志工服務平台與青年領袖培育使命。'
})

const missions = [
  {
    title: '成為各公益團體在校園內的志工平台',
    text: '社會上有各式公益團體需要年輕人擔任長、短期的志工，卻鮮少有穩定的志工招募管道。愛潮關懷社擔任公益團體與學生族群間的媒合平台，讓志工資源可穩定投入社會服務。藉由服務的過程打開學生們的視野，增進對於社會公益以及社會關懷的使命感。'
  },
  {
    title: '成為校內社團的志工服務平台',
    text: '不論是學術性社團、康樂性社團，都能透過公益服務而找到生命的意義及價值。連結各社團的不同才華特質，在服務中各司其職，不僅能以多元、創意的方式表達社會關懷，更能達到人人皆可服務的效果。'
  },
  {
    title: '讓學生的志工服務與社會、職場、企業結合',
    text: '愛潮關懷社所選擇合作的公益社福機構皆已行之多年，不論在組織、規模、使命都相當成熟。學生志工不僅參加服務，更在籌劃、活動中藉由與機構裡的社會人士、主管們共事，更了解社會議題和身為世界公民的責任，進而栽培出對社會有使命的年輕領袖。'
  },
  {
    title: '培育青年領袖',
    text: '社團裡的服務除了需要接觸服務對象，更要與合作的公益機構培養良好的合作夥伴關係。藉此不斷訓練成熟的溝通能力、組織、管理能力、對社會需求的敏銳觀察力，進而成為能影響生活周遭人事物的領袖。'
  }
]
</script>

<template>
  <CommonPageHero
    eyebrow="About"
    title="關於愛潮關懷社"
    :description="settings?.slogan || '讓陪伴走進日常，讓關懷成為行動。'"
  />

  <section class="section-y">
    <div class="page-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <CommonSectionTitle
        eyebrow="Origin"
        title="從一次圓夢計畫，走向長期公益合作"
      />
      <div class="prose-content rounded-lg bg-white p-6 shadow-sm">
        <p>
          2010 年 7 月，一群中大的學生自發性地和天使心家族合作，為自閉兒實施圓夢計劃，從此展開了和公益團體合作的志工之門。同年 9 月，和天晟醫院合作招募短期的醫院志工；沒想到造成熱烈回響，原訂的 20 人名額爆增至 200 人參加，合作的公益團體也由 2 個單位倍增至 4 個單位。
        </p>
        <p>
          至今中原大學的大學生、研究生已有 443 人次參加志工；合作單位也增加至壢新醫院、天晟醫院、天使心家族、南區早期資源療育發展中心、十字路口咖啡麵包坊、台灣馬術治療中心、國際兒童村、世界展望會、瑪潮關懷協會等九個公益機構。
        </p>
      </div>
    </div>
  </section>

  <section class="section-y bg-cloud">
    <div class="page-shell">
      <CommonSectionTitle eyebrow="Mission" title="我們持續投入的四個方向" />
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        <article v-for="mission in missions" :key="mission.title" class="rounded-lg bg-white p-6 shadow-sm">
          <h2 class="text-xl font-bold text-ink">{{ mission.title }}</h2>
          <p class="mt-3 leading-7 text-muted">{{ mission.text }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
