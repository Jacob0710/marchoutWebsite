<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data, error } = await usePublicPost(slug)
if (error.value || !data.value?.item) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
const post = computed(() => data.value!.item)
useSeo({ title: post.value.title, description: post.value.excerpt, image: post.value.coverUrl ?? undefined })
</script>

<template>
  <CommonPageHero eyebrow="News" :title="post.title" :description="post.excerpt" :image-url="post.coverUrl || undefined" />
  <section class="section-y">
    <div class="page-shell max-w-4xl">
      <p class="text-sm font-bold text-coral">{{ formatDate(post.publishedAt) }}</p>
      <article class="prose-content mt-6 whitespace-pre-wrap rounded-lg bg-white p-6 shadow-sm sm:p-8">{{ post.content }}</article>
      <CommonBaseButton to="/news" class="mt-8" variant="secondary">回消息列表</CommonBaseButton>
    </div>
  </section>
</template>
