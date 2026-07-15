<script setup lang="ts">
import { LogOut, Monitor, UserRound } from 'lucide-vue-next'

const { user, logout } = useAdminAuth()
const isLoggingOut = ref(false)
const logoutError = ref('')

const handleLogout = async () => {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  logoutError.value = ''
  const didLogout = await logout()
  if (!didLogout) logoutError.value = '登出失敗，請稍後再試。'
  isLoggingOut.value = false
}
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
          {{ user?.email ?? '管理員' }}
        </div>
        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal"
          :disabled="isLoggingOut"
          @click="handleLogout"
        >
          <LogOut class="size-4" aria-hidden="true" />
          {{ isLoggingOut ? '登出中' : '登出' }}
        </button>
      </div>
    </div>
    <p v-if="logoutError" class="px-4 pb-3 text-right text-sm font-semibold text-red-700 sm:px-6 lg:px-8">
      {{ logoutError }}
    </p>
  </header>
</template>
