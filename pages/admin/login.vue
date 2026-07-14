<script setup lang="ts">
import { HeartHandshake, Loader2, LockKeyhole } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const { login } = useAuth()

const form = reactive({
  email: 'admin@marchoutforlove.org',
  password: 'password'
})
const isSubmitting = ref(false)
const submitError = ref('')

const { errors, validate, clearError } = useFormValidation<typeof form>({
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email.'
  },
  password: {
    required: true,
    minLength: 6,
    message: 'Password must be at least 6 characters.'
  }
})

useSeo({
  title: '後台登入',
  description: '愛潮關懷社內容管理後台登入。'
})

const handleSubmit = async () => {
  submitError.value = ''
  if (!validate(form)) return

  isSubmitting.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 450))
    const redirectTo = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/dashboard'
    await login(redirectTo, {
      email: form.email,
      password: form.password
    })
  } catch {
    submitError.value = 'Login failed. Please try again.'
  } finally {
    isSubmitting.value = false
  }
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
          <h1 class="mt-4 text-5xl font-bold leading-tight">內容管理後台</h1>
          <p class="mt-5 max-w-xl text-lg leading-8 text-slate-200">
            整理活動、消息、檔案與年度成果，讓服務紀錄能被持續查找。
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

        <p v-if="submitError" class="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {{ submitError }}
        </p>

        <form class="mt-8 grid gap-5" novalidate @submit.prevent="handleSubmit">
          <label class="grid gap-2 text-sm font-semibold text-ink">
            Email
            <input
              v-model="form.email"
              type="email"
              class="focus-ring h-11 rounded-md border px-3 text-sm"
              :class="errors.email ? 'border-red-300' : 'border-slate-200'"
              @input="clearError('email')"
            />
            <span v-if="errors.email" class="text-xs font-semibold text-red-600">{{ errors.email }}</span>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            Password
            <input
              v-model="form.password"
              type="password"
              class="focus-ring h-11 rounded-md border px-3 text-sm"
              :class="errors.password ? 'border-red-300' : 'border-slate-200'"
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
