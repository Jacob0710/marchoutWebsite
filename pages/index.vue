<script setup lang="ts">
import { ArrowRight, FileText, HandHeart, MapPin, Newspaper, Sparkles, UsersRound } from 'lucide-vue-next'

const { programs } = useMockContent()
const { data: postsData, error: postsError } = await usePublicPosts()
const { data: yearsData, error: yearsError } = await usePublicYears()
const { data: settingsData, error: settingsError } = await usePublicSettings()
const posts = computed(() => postsData.value?.items ?? [])
const years = computed(() => yearsData.value?.items ?? [])
const settings = computed(() => settingsData.value?.item)
const {
  data: activities,
  error: activitiesError,
  pending: activitiesPending
} = await usePublicActivities()
const featuredActivities = computed(() => activities.value.filter((activity) => activity.isFeatured))

useSeo({
  title: 'March Out For Love | 愛潮關懷社',
  description: settings.value?.defaultSeoDescription || '愛潮關懷社以陪伴、服務與探索行動，連結青年與社區。',
  image: featuredActivities.value[0]?.coverImageUrl
})

const stats = [
  { label: '年度成果', value: '6', detail: '109-114 學年' },
  { label: '活動紀錄', value: '6', detail: '持續擴充中' },
  { label: '服務夥伴', value: '120+', detail: '志工與合作單位' }
]
</script>

<template>
  <section class="relative isolate overflow-hidden bg-ink text-white">
    <img
      src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80"
      alt="青年志工一起行動"
      class="absolute inset-0 -z-20 size-full object-cover"
    />
    <div class="absolute inset-0 -z-10 bg-ink/70" />
    <div class="page-shell flex min-h-[78vh] items-end pb-14 pt-28">
      <div class="hero-in max-w-4xl">
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-honey">愛潮關懷社</p>
        <h1 class="mt-4 text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">March Out For Love</h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">
          <template v-if="settings">{{ settings.heroSubtitle || settings.slogan }}。{{ settings.aboutSummary }}</template>
          <template v-else-if="settingsError">網站設定暫時無法載入，請稍後重新整理。</template>
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <CommonBaseButton to="/programs">了解服務計畫</CommonBaseButton>
          <CommonBaseButton to="/activities" variant="secondary">瀏覽活動成果</CommonBaseButton>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white py-8">
    <div class="page-shell grid gap-4 sm:grid-cols-3">
      <div v-for="stat in stats" :key="stat.label" class="rounded-lg border border-slate-200 p-5">
        <p class="text-4xl font-bold text-coral">{{ stat.value }}</p>
        <p class="mt-2 font-bold text-ink">{{ stat.label }}</p>
        <p class="mt-1 text-sm text-muted">{{ stat.detail }}</p>
      </div>
    </div>
  </section>

  <section class="section-y">
    <div class="page-shell grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <div>
        <CommonSectionTitle
          eyebrow="About"
          title="用穩定陪伴回應現場需要"
          description="愛潮關懷社相信，服務不是一次性的熱情，而是一群人願意把時間、方法和關係慢慢累積。"
        />
        <div class="mt-8 grid gap-4">
          <div class="flex gap-4 rounded-lg bg-white p-5 shadow-sm">
            <HandHeart class="mt-1 size-6 shrink-0 text-coral" aria-hidden="true" />
            <div>
              <h3 class="font-bold text-ink">從孩子與社區的日常出發</h3>
              <p class="mt-2 text-sm leading-6 text-muted">把需求確認、志工培力和後續追蹤放進每一個服務流程。</p>
            </div>
          </div>
          <div class="flex gap-4 rounded-lg bg-white p-5 shadow-sm">
            <UsersRound class="mt-1 size-6 shrink-0 text-teal" aria-hidden="true" />
            <div>
              <h3 class="font-bold text-ink">讓青年在行動中學會負責</h3>
              <p class="mt-2 text-sm leading-6 text-muted">透過組別分工、活動反思與資料整理，讓服務經驗能被保存與傳承。</p>
            </div>
          </div>
        </div>
      </div>
      <img
        src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1400&q=80"
        alt="志工討論服務計畫"
        class="aspect-[5/4] w-full rounded-lg object-cover shadow-soft"
      />
    </div>
  </section>

  <section class="section-y bg-cloud">
    <div class="page-shell">
      <CommonSectionTitle
        eyebrow="Programs"
        title="三條服務主軸"
        description="每一項計畫都有明確的合作對象、志工任務與成果紀錄。"
      />
      <div class="mt-10 grid gap-6 md:grid-cols-3">
        <CommonBaseCard v-for="program in programs" :key="program.id">
          <img :src="program.imageUrl" :alt="program.title" class="aspect-[4/3] w-full object-cover" />
          <div class="p-5">
            <h3 class="text-xl font-bold text-ink">{{ program.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-muted">{{ program.summary }}</p>
            <NuxtLink
              :to="program.slug === 'breakfast' ? '/programs/breakfast' : program.slug === 'exploration' ? '/programs/exploration' : '/programs'"
              class="mt-5 inline-flex items-center gap-2 text-sm font-bold text-coral"
            >
              查看計畫
              <ArrowRight class="size-4" aria-hidden="true" />
            </NuxtLink>
          </div>
        </CommonBaseCard>
      </div>
    </div>
  </section>

  <section class="section-y">
    <div class="page-shell">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <CommonSectionTitle
          eyebrow="Activities"
          title="近期活動成果"
          description="精選活動紀錄、服務成果與現場照片。"
        />
        <CommonBaseButton to="/activities" variant="secondary">全部活動</CommonBaseButton>
      </div>
      <CommonLoadingState v-if="activitiesPending" class="mt-10" />
      <CommonEmptyState
        v-else-if="activitiesError"
        class="mt-10"
        title="活動資料暫時無法載入"
        description="請稍後再試，或前往活動成果頁查看最新狀態。"
      />
      <div v-else-if="featuredActivities.length" class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ActivityCard
          v-for="activity in featuredActivities.slice(0, 4)"
          :key="activity.id"
          :activity="activity"
        />
      </div>
      <CommonEmptyState
        v-else
        class="mt-10"
        title="目前沒有精選活動"
        description="活動資料整理完成後會顯示在這裡。"
      />
    </div>
  </section>

  <section class="section-y bg-white">
    <div class="page-shell grid gap-10 lg:grid-cols-[1fr_0.8fr]">
      <div>
        <CommonSectionTitle eyebrow="Years" title="年度成果軌跡" description="從 109 到 114 學年，逐步累積可被查找的服務紀錄。" />
        <CommonEmptyState v-if="yearsError" class="mt-6" title="年度成果暫時無法載入" description="請稍後重新整理。" />
        <div v-else class="mt-8 grid gap-3 sm:grid-cols-3">
          <NuxtLink
            v-for="year in years"
            :key="year.id"
            :to="`/years/${year.academicYear}`"
            class="focus-ring rounded-lg border border-slate-200 bg-paper p-5 transition hover:border-coral hover:bg-white"
          >
            <p class="text-3xl font-bold text-coral">{{ year.academicYear }}</p>
            <p class="mt-2 text-sm font-bold text-ink">{{ year.theme || year.title }}</p>
          </NuxtLink>
        </div>
      </div>
      <div class="rounded-lg bg-ink p-6 text-white">
        <Sparkles class="size-8 text-honey" aria-hidden="true" />
        <h3 class="mt-5 text-2xl font-bold">影像紀錄</h3>
        <p class="mt-3 leading-7 text-slate-300">整理活動片段、志工訪談與服務回顧，讓每一次投入都能被看見。</p>
        <ActivityYouTubeEmbed class="mt-6" title="March Out For Love 年度回顧" url="https://www.youtube.com/embed/dQw4w9WgXcQ" />
      </div>
    </div>
  </section>

  <section class="section-y bg-cloud">
    <div class="page-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <CommonSectionTitle eyebrow="News" title="最新消息" description="招募、活動公告與公開資料更新。" />
        <CommonBaseButton to="/news" class="mt-8" variant="secondary">更多消息</CommonBaseButton>
      </div>
      <div class="grid gap-4">
        <CommonEmptyState v-if="postsError" title="消息暫時無法載入" description="請稍後重新整理。" />
        <NuxtLink
          v-for="post in posts.slice(0, 3)"
          :key="post.id"
          :to="`/news/${post.slug}`"
          class="focus-ring flex gap-4 rounded-lg bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
        >
          <img v-if="post.coverUrl" :src="post.coverUrl" :alt="post.coverAlt" class="size-24 rounded-md object-cover" />
          <div v-else class="grid size-24 shrink-0 place-items-center rounded-md bg-cloud text-xs font-bold text-muted">News</div>
          <div>
            <p class="text-xs font-semibold text-coral">{{ formatDate(post.publishedAt) }}</p>
            <h3 class="mt-2 font-bold text-ink">{{ post.title }}</h3>
            <p class="mt-1 line-clamp-2 text-sm leading-6 text-muted">{{ post.excerpt }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>

  <section class="section-y">
    <div class="page-shell grid gap-6 md:grid-cols-3">
      <NuxtLink to="/files" class="focus-ring rounded-lg bg-white p-6 shadow-sm transition hover:-translate-y-1">
        <FileText class="size-7 text-teal" aria-hidden="true" />
        <h3 class="mt-4 text-xl font-bold">檔案下載</h3>
        <p class="mt-2 text-sm leading-6 text-muted">成果報告、手冊與行政表單集中整理。</p>
      </NuxtLink>
      <NuxtLink to="/contact" class="focus-ring rounded-lg bg-white p-6 shadow-sm transition hover:-translate-y-1">
        <MapPin class="size-7 text-coral" aria-hidden="true" />
        <h3 class="mt-4 text-xl font-bold">聯絡合作</h3>
        <p class="mt-2 text-sm leading-6 text-muted">歡迎社區、學校與志工夥伴與我們聯繫。</p>
      </NuxtLink>
      <NuxtLink to="/news" class="focus-ring rounded-lg bg-white p-6 shadow-sm transition hover:-translate-y-1">
        <Newspaper class="size-7 text-honey" aria-hidden="true" />
        <h3 class="mt-4 text-xl font-bold">公告資訊</h3>
        <p class="mt-2 text-sm leading-6 text-muted">掌握招募、活動與公開資料更新。</p>
      </NuxtLink>
    </div>
  </section>
</template>
