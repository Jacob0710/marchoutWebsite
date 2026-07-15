<script setup lang="ts">
import {
  CalendarDays,
  Gauge,
  HeartHandshake
} from 'lucide-vue-next'

const route = useRoute()

const items = [
  { label: '後台首頁', to: '/admin', icon: Gauge },
  { label: '活動檢視', to: '/admin/activities', icon: CalendarDays }
]
</script>

<template>
  <aside class="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
    <div class="sticky top-0 grid h-screen grid-rows-[auto_1fr_auto]">
      <NuxtLink to="/" class="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
        <span class="grid size-10 place-items-center rounded-md bg-coral text-white">
          <HeartHandshake class="size-5" aria-hidden="true" />
        </span>
        <span>
          <span class="block text-sm font-bold text-ink">愛潮關懷社</span>
          <span class="block text-xs text-muted">Admin Console</span>
        </span>
      </NuxtLink>

      <nav class="grid content-start gap-1 px-4 py-5">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="focus-ring flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-cloud hover:text-ink"
          :class="{ 'bg-ink text-white hover:bg-ink hover:text-white': route.path === item.to || route.path.startsWith(`${item.to}/`) }"
        >
          <component :is="item.icon" class="size-4" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="border-t border-slate-200 p-4 text-xs leading-6 text-muted">March Out For Love</div>
    </div>
  </aside>
</template>
