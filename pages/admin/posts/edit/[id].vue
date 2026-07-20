<script setup lang="ts">
import type { AdminPost } from '~/types/coreContent'
definePageMeta({ layout: 'admin' })
const route = useRoute()
const { data, error } = await useFetch<{ item: AdminPost }>(`/api/admin/posts/${route.params.id}`)
if (error.value || !data.value?.item) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
</script>
<template><div class="grid gap-6"><div><p class="text-sm font-bold text-coral">Posts</p><h1 class="mt-1 text-3xl font-bold text-ink">編輯消息</h1></div><AdminPostForm :item="data?.item" /></div></template>
