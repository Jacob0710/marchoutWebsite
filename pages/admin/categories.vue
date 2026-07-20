<script setup lang="ts">
import { Compass, FolderLock, HeartHandshake } from 'lucide-vue-next'
definePageMeta({ layout: 'admin' })
const categories = [
  { value: 'regular', label: '常態陪伴', description: '持續性的陪伴、課輔與社區服務。', icon: HeartHandshake },
  { value: 'project', label: '專案活動', description: '具有明確期間與成果目標的主題專案。', icon: FolderLock },
  { value: 'exploration', label: '探索走讀', description: '參訪、走讀與體驗式學習活動。', icon: Compass }
]
</script>
<template><div class="grid gap-6"><div><p class="text-sm font-bold text-coral">Categories</p><h1 class="mt-1 text-3xl font-bold text-ink">活動分類</h1><p class="mt-2 max-w-3xl text-sm leading-6 text-muted">分類是系統固定值，只供活動內容選用。為維持資料一致性與權限安全，此頁不提供新增、修改或刪除。</p></div><div class="grid gap-4 md:grid-cols-3"><article v-for="item in categories" :key="item.value" class="rounded-lg bg-white p-6 shadow-sm"><component :is="item.icon" class="size-6 text-teal" aria-hidden="true" /><h2 class="mt-5 text-xl font-bold text-ink">{{ item.label }}</h2><code class="mt-2 inline-block rounded bg-cloud px-2 py-1 text-xs text-muted">{{ item.value }}</code><p class="mt-4 text-sm leading-6 text-muted">{{ item.description }}</p></article></div></div></template>
