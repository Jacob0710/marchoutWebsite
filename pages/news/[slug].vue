<script setup lang="ts">
const route = useRoute()
const { getPostBySlug } = useMockContent()
const post = computed(() => getPostBySlug(String(route.params.slug)))

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

useSeo({
  title: post.value.title,
  description: post.value.excerpt,
  image: post.value.coverImageUrl
})
</script>

<template>
  <CommonPageHero
    v-if="post"
    eyebrow="News"
    :title="post.title"
    :description="post.excerpt"
    :image-url="post.coverImageUrl"
  />

  <section v-if="post" class="section-y">
    <div class="page-shell max-w-4xl">
      <p class="text-sm font-bold text-coral">{{ formatDate(post.publishedAt) }}</p>
      <article class="prose-content mt-6 rounded-lg bg-white p-6 shadow-sm sm:p-8">
        <p>{{ post.content }}</p>
        <p>
          後續資訊會同步更新於網站與社群平台。若需要合作或報名細節，歡迎透過聯絡頁與我們聯繫。
        </p>
      </article>
      <CommonBaseButton to="/news" class="mt-8" variant="secondary">回消息列表</CommonBaseButton>
    </div>
  </section>
</template>
