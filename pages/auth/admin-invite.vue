<script setup lang="ts">
import { HeartHandshake, KeyRound, Loader2 } from 'lucide-vue-next'

definePageMeta({ layout: false })
useSeo({ title: '接受管理員邀請', description: '使用既有帳號接受愛潮關懷社管理員邀請。' })

const token = ref('')
const tokenReady = ref(false)
const form = reactive({ email: '', password: '' })
const fieldError = ref('')
const { isSubmitting, error, accept } = useAcceptAdminInvitation()

onMounted(() => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const candidate = params.get('token') ?? ''
  token.value = /^[0-9a-f]{64}$/.test(candidate) ? candidate : ''
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  tokenReady.value = true
})
onBeforeUnmount(() => { token.value = ''; form.password = '' })

const submit = async () => {
  fieldError.value = ''
  const email = form.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || form.password.length < 6) {
    fieldError.value = '請輸入有效的 Email 與密碼。'; return
  }
  if (!token.value) { fieldError.value = '邀請連結無效或 token 已遺失。'; return }
  const ok = await accept({ email, password: form.password, token: token.value })
  form.password = ''
  if (ok) { token.value = ''; await navigateTo('/admin') }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-paper px-4 py-12">
    <section class="w-full max-w-lg rounded-lg bg-white p-7 shadow-soft sm:p-9">
      <div class="flex items-center gap-3"><span class="grid size-12 place-items-center rounded-md bg-coral text-white"><HeartHandshake class="size-6" aria-hidden="true" /></span><div><p class="text-sm font-semibold text-muted">March Out For Love</p><h1 class="text-2xl font-bold text-ink">接受管理員邀請</h1></div></div>
      <p class="mt-6 text-sm leading-6 text-muted">請使用與邀請 Email 完全相同的既有 Supabase Auth 帳號登入。成功後才會原子化授予後台權限。</p>
      <p v-if="tokenReady && !token" role="alert" class="mt-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">邀請連結無效、已遺失，或網址不完整。請聯絡管理員撤銷後重建。</p>
      <p v-if="fieldError || error" role="alert" class="mt-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ fieldError || error }}</p>
      <form class="mt-6 grid gap-5" novalidate @submit.prevent="submit">
        <label class="grid gap-2 text-sm font-bold text-ink">Email<input v-model="form.email" type="email" autocomplete="username" class="focus-ring h-11 rounded-md border border-slate-200 px-3 text-sm" :disabled="isSubmitting" /></label>
        <label class="grid gap-2 text-sm font-bold text-ink">密碼<input v-model="form.password" type="password" autocomplete="current-password" class="focus-ring h-11 rounded-md border border-slate-200 px-3 text-sm" :disabled="isSubmitting" /></label>
        <button type="submit" class="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSubmitting || !token"><Loader2 v-if="isSubmitting" class="size-4 animate-spin" /><KeyRound v-else class="size-4" />{{ isSubmitting ? '驗證中' : '驗證並接受邀請' }}</button>
      </form>
      <NuxtLink to="/" class="focus-ring mt-6 inline-block text-sm font-bold text-teal underline-offset-4 hover:underline">返回網站首頁</NuxtLink>
    </section>
  </main>
</template>
