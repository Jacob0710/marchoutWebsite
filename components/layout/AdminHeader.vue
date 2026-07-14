<script setup lang="ts">
import { LogOut, Monitor, UserRound } from 'lucide-vue-next'

const { logout } = useAuth()
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
    <div class="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Administration</p>
        <h1 class="text-lg font-bold text-ink">內容管理後台</h1>
      </div>

      <div class="flex items-center gap-2">
        <NuxtLink
          to="/"
          class="focus-ring hidden items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-cloud sm:flex"
        >
          <Monitor class="size-4" aria-hidden="true" />
          前台
        </NuxtLink>
        <div class="hidden items-center gap-2 rounded-md bg-cloud px-3 py-2 text-sm font-semibold text-slate-700 sm:flex">
          <UserRound class="size-4 text-teal" aria-hidden="true" />
          Content Admin
        </div>
        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal"
          @click="logout"
        >
          <LogOut class="size-4" aria-hidden="true" />
          登出
        </button>
      </div>
    </div>
  </header>
</template>
