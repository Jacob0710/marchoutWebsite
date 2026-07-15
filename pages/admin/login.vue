<script setup lang="ts">
import { HeartHandshake, Loader2, LockKeyhole } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const { login } = useAdminAuth()

const form = reactive({
  email: '',
  password: ''
})
const isSubmitting = ref(false)
const submitError = ref('')

const { errors, validate, clearError } = useFormValidation<typeof form>({
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '請輸入有效的 Email。'
  },
  password: {
    required: true,
    minLength: 6,
    message: '密碼至少需要 6 個字元。'
  }
})

useSeo({
  title: '後台登入',
  description: '愛潮關懷社管理後台登入。'
})

const getRedirectTarget = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
  return redirect === '/admin/activities' ? redirect : '/admin'
}

const handleSubmit = async () => {
  submitError.value = ''
  if (!validate(form) || isSubmitting.value) return

  isSubmitting.value = true
  const result = await login({ email: form.email, password: form.password })

  if (result.ok) {
    form.password = ''
    await navigateTo(getRedirectTarget())
  } else if (result.reason === 'forbidden') {
    submitError.value = '此帳號沒有管理權限。'
  } else if (result.reason === 'invalid-credentials') {
    submitError.value = '登入失敗，請確認帳號或密碼。'
  } else {
    submitError.value = '登入服務暫時無法使用，請稍後再試。'
  }

  isSubmitting.value = false
}
</script>

<template>
  <main class="grid min-h-screen bg-paper lg:grid-cols-[0.95fr_1.05fr]">
    <section class="relative hidden overflow-hidden bg-ink text-white lg:block">
      <img
        src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1600&q=80"
        alt="志工討論活動"
        class="absolute inset-0 size-full object-cover"
      />
      <div class="absolute inset-0 bg-ink/70" />
      <div class="relative z-10 flex min-h-screen items-end p-12">
        <div>
          <p class="text-sm font-bold uppercase tracking-[0.18em] text-honey">March Out For Love</p>
          <h1 class="mt-4 text-5xl font-bold leading-tight">管理後台</h1>
          <p class="mt-5 max-w-xl text-lg leading-8 text-slate-200">
            使用已授權的管理員帳號查看活動資料。
          </p>
        </div>
      </div>
    </section>

    <section class="grid place-items-center px-4 py-12">
      <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-soft">
        <div class="flex items-center gap-3">
          <span class="grid size-12 place-items-center rounded-md bg-coral text-white">
            <HeartHandshake class="size-6" aria-hidden="true" />
          </span>
          <div>
            <p class="text-sm font-semibold text-muted">愛潮關懷社</p>
            <h2 class="text-2xl font-bold text-ink">登入後台</h2>
          </div>
        </div>

        <p v-if="submitError" role="alert" class="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {{ submitError }}
        </p>

        <form class="mt-8 grid gap-5" novalidate @submit.prevent="handleSubmit">
          <label class="grid gap-2 text-sm font-semibold text-ink">
            Email
            <input
              v-model="form.email"
              type="email"
              autocomplete="username"
              class="focus-ring h-11 rounded-md border px-3 text-sm"
              :class="errors.email ? 'border-red-300' : 'border-slate-200'"
              :aria-invalid="Boolean(errors.email)"
              @input="clearError('email')"
            />
            <span v-if="errors.email" class="text-xs font-semibold text-red-600">{{ errors.email }}</span>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            密碼
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              class="focus-ring h-11 rounded-md border px-3 text-sm"
              :class="errors.password ? 'border-red-300' : 'border-slate-200'"
              :aria-invalid="Boolean(errors.password)"
              @input="clearError('password')"
            />
            <span v-if="errors.password" class="text-xs font-semibold text-red-600">{{ errors.password }}</span>
          </label>
          <button
            type="submit"
            class="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSubmitting"
          >
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
            <LockKeyhole v-else class="size-4" aria-hidden="true" />
            {{ isSubmitting ? '登入中' : '登入' }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>
