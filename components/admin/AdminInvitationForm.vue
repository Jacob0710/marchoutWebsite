<script setup lang="ts">
import { Loader2, Send } from 'lucide-vue-next'
import type { CreateAdminInvitationInput } from '~/types/adminAccess'

const props = withDefaults(defineProps<{ isLoading?: boolean; error?: string; resetKey?: number }>(), { isLoading: false, error: '', resetKey: 0 })
const emit = defineEmits<{ submit: [input: CreateAdminInvitationInput] }>()
const email = ref('')
const expiresInDays = ref(7)
const fieldError = ref('')
watch(() => props.resetKey, () => { email.value = ''; expiresInDays.value = 7; fieldError.value = '' })
const submit = () => {
  const normalized = email.value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
    fieldError.value = '請輸入有效的 Email。'; return
  }
  fieldError.value = ''
  emit('submit', { email: normalized, expiresInDays: expiresInDays.value })
}
</script>

<template>
  <form class="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_10rem_auto] md:items-end" novalidate @submit.prevent="submit">
    <label class="grid gap-2 text-sm font-bold text-ink">受邀者 Email<input v-model="email" type="email" autocomplete="off" class="focus-ring h-11 rounded-md border border-slate-200 px-3 text-sm" :aria-invalid="Boolean(fieldError)" @input="fieldError = ''" /><span v-if="fieldError" class="text-xs text-red-700">{{ fieldError }}</span></label>
    <label class="grid gap-2 text-sm font-bold text-ink">有效天數<select v-model.number="expiresInDays" class="focus-ring h-11 rounded-md border border-slate-200 px-3 text-sm"><option v-for="days in [1, 3, 7, 14, 30]" :key="days" :value="days">{{ days }} 天</option></select></label>
    <button type="submit" class="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-coral px-5 text-sm font-bold text-white transition hover:bg-coralDark disabled:cursor-not-allowed disabled:opacity-60" :disabled="isLoading">
      <Loader2 v-if="isLoading" class="size-4 animate-spin" aria-hidden="true" /><Send v-else class="size-4" aria-hidden="true" />建立邀請
    </button>
    <p v-if="error" role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 md:col-span-3">{{ error }}</p>
  </form>
</template>
