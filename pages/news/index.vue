<script setup lang="ts">
const search = ref('')
const { data, pending, error } = await usePublicPosts()
const posts = computed(() => data.value?.items ?? [])
const filteredPosts = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return keyword ? posts.value.filter((post) => [post.title, post.excerpt, post.content].join(' ').toLowerCase().includes(keyword)) : posts.value
})
useSeo({ title: '最新消息', description: '愛潮關懷社招募、活動與公開資料更新。' })
</script>

<template>
  <CommonPageHero eyebrow="News" title="最新消息" description="掌握招募、合作、活動公告與成果資料更新。" image-url="https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1800&q=80" />
  <section class="section-y">
    <div class="page-shell">
      <div class="max-w-md"><CommonSearchInput v-model="search" placeholder="搜尋消息" /></div>
      <CommonLoadingState v-if="pending" class="mt-8" />
      <CommonEmptyState v-else-if="error" class="mt-8" title="消息暫時無法載入" description="請稍後重新整理頁面。" />
      <div v-else-if="filteredPosts.length" class="mt-8 grid gap-6 md:grid-cols-3">
        <CommonBaseCard v-for="post in filteredPosts" :key="post.id">
          <NuxtLink :to="`/news/${post.slug}`" class="group block">
            <img v-if="post.coverUrl" :src="post.coverUrl" :alt="post.coverAlt" class="aspect-[4/3] w-full object-cover" />
            <div v-else class="grid aspect-[4/3] place-items-center bg-cloud text-sm font-bold text-muted">March Out For Love</div>
            <div class="p-5">
              <p class="text-xs font-bold text-coral">{{ formatDate(post.publishedAt) }}</p>
              <h2 class="mt-3 text-xl font-bold text-ink">{{ post.title }}</h2>
              <p class="mt-3 line-clamp-3 text-sm leading-6 text-muted">{{ post.excerpt }}</p>
            </div>
          </NuxtLink>
        </CommonBaseCard>
      </div>
      <CommonEmptyState v-else class="mt-8" title="目前沒有公開消息" description="新消息發布後會顯示在這裡。" />
    </div>
  </section>
</template>
