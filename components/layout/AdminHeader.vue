<script setup lang="ts">
import { LogOut, Menu, Monitor, UserRound, X } from 'lucide-vue-next'

const { user, logout } = useAdminAuth()
const route = useRoute()
const isLoggingOut = ref(false)
const logoutError = ref('')
const mobileMenuOpen = ref(false)

const mobileItems = [
  { label: '後台首頁', to: '/admin/dashboard' },
  { label: '活動管理', to: '/admin/activities' },
  { label: '最新消息', to: '/admin/posts' },
  { label: '檔案下載', to: '/admin/files' },
  { label: 'FAQ', to: '/admin/faq' },
  { label: '年度成果', to: '/admin/years' },
  { label: '網站設定', to: '/admin/settings' },
  { label: '分類說明', to: '/admin/categories' },
  { label: '管理員存取權', to: '/admin/access' }
]

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

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
        <button
          type="button"
          class="focus-ring grid size-10 place-items-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-cloud lg:hidden"
          :aria-expanded="mobileMenuOpen"
          aria-controls="admin-mobile-navigation"
          :aria-label="mobileMenuOpen ? '關閉後台選單' : '開啟後台選單'"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <X v-if="mobileMenuOpen" class="size-5" aria-hidden="true" />
          <Menu v-else class="size-5" aria-hidden="true" />
        </button>
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
    <nav
      v-if="mobileMenuOpen"
      id="admin-mobile-navigation"
      class="grid grid-cols-2 gap-2 border-t border-slate-200 px-4 py-4 sm:grid-cols-3 lg:hidden"
      aria-label="後台功能選單"
    >
      <NuxtLink
        v-for="item in mobileItems"
        :key="item.to"
        :to="item.to"
        class="focus-ring rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-cloud"
        :class="{ 'bg-ink text-white hover:bg-ink': route.path === item.to || route.path.startsWith(`${item.to}/`) }"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
    <p v-if="logoutError" class="px-4 pb-3 text-right text-sm font-semibold text-red-700 sm:px-6 lg:px-8">
      {{ logoutError }}
    </p>
  </header>
</template>
