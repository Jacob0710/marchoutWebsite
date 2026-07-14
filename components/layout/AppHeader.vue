<script setup lang="ts">
import { HeartHandshake, Menu, X } from 'lucide-vue-next'

const route = useRoute()
const isOpen = ref(false)

const navItems = [
  { label: '關於我們', to: '/about' },
  { label: '組織架構', to: '/organization' },
  { label: '服務計畫', to: '/programs' },
  { label: '活動成果', to: '/activities' },
  { label: '最新消息', to: '/news' },
  { label: '年度資料', to: '/years' },
  { label: '聯絡', to: '/contact' }
]

watch(
  () => route.fullPath,
  () => {
    isOpen.value = false
  }
)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-white/60 bg-paper/90 backdrop-blur-xl">
    <nav class="page-shell flex min-h-16 items-center justify-between gap-4">
      <NuxtLink to="/" class="focus-ring flex items-center gap-3 rounded-md">
        <span class="grid size-10 place-items-center rounded-full bg-coral text-white">
          <HeartHandshake class="size-5" aria-hidden="true" />
        </span>
        <span class="leading-tight">
          <span class="block text-sm font-semibold text-ink">愛潮關懷社</span>
          <span class="block text-xs text-muted">March Out For Love</span>
        </span>
      </NuxtLink>

      <div class="hidden items-center gap-1 lg:flex">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="focus-ring rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-coral"
          :class="{ 'bg-white text-coral shadow-sm': route.path === item.to || route.path.startsWith(`${item.to}/`) }"
        >
          {{ item.label }}
        </NuxtLink>
      </div>

      <div class="hidden items-center gap-3 lg:flex">
        <NuxtLink
          to="/files"
          class="focus-ring rounded-md px-4 py-2 text-sm font-semibold text-teal transition hover:bg-white"
        >
          檔案下載
        </NuxtLink>
        <NuxtLink
          to="/admin/login"
          class="focus-ring rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal"
        >
          後台
        </NuxtLink>
      </div>

      <button
        class="focus-ring inline-grid size-10 place-items-center rounded-md border border-slate-200 bg-white lg:hidden"
        type="button"
        :aria-label="isOpen ? '關閉選單' : '開啟選單'"
        @click="isOpen = !isOpen"
      >
        <X v-if="isOpen" class="size-5" aria-hidden="true" />
        <Menu v-else class="size-5" aria-hidden="true" />
      </button>
    </nav>

    <div v-if="isOpen" class="border-t border-slate-200 bg-white lg:hidden">
      <div class="page-shell grid gap-1 py-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="focus-ring rounded-md px-3 py-3 text-sm font-semibold text-slate-700"
        >
          {{ item.label }}
        </NuxtLink>
        <NuxtLink to="/files" class="focus-ring rounded-md px-3 py-3 text-sm font-semibold text-teal">
          檔案下載
        </NuxtLink>
        <NuxtLink to="/admin/login" class="focus-ring rounded-md px-3 py-3 text-sm font-semibold text-ink">
          後台
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
