<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const statusCode = computed(() => Number(props.error.statusCode) === 404 ? 404 : 500)
const title = computed(() => statusCode.value === 404 ? '找不到頁面' : '暫時無法顯示頁面')
const message = computed(() => statusCode.value === 404 ? '您要找的公開頁面不存在。' : '服務暫時無法使用，請稍後再試。')
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-paper px-6 text-ink">
    <section class="max-w-lg text-center" aria-labelledby="error-title">
      <p class="text-sm font-bold text-muted">{{ statusCode }}</p>
      <h1 id="error-title" class="mt-3 text-3xl font-bold">{{ title }}</h1>
      <p class="mt-4 text-muted">{{ message }}</p>
      <button class="mt-8 rounded bg-ink px-5 py-3 font-bold text-white" type="button" @click="clearError({ redirect: '/' })">
        回到首頁
      </button>
    </section>
  </main>
</template>
