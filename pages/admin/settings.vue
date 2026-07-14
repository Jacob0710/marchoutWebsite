<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

const { settings } = useMockContent()
const repository = useAdminRepository()

const form = reactive({
  clubNameZh: settings.clubNameZh,
  clubNameEn: settings.clubNameEn,
  email: settings.email,
  phone: settings.phone,
  facebookUrl: settings.facebookUrl,
  instagramUrl: settings.instagramUrl,
  slogan: settings.slogan
})
const isSubmitting = ref(false)
const isLoading = ref(true)
const submitError = ref('')
const submitMessage = ref('')

const { errors, validate, clearError } = useFormValidation<typeof form>({
  clubNameZh: { required: true, message: 'Please enter the Chinese name.' },
  clubNameEn: { required: true, message: 'Please enter the English name.' },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email.'
  },
  slogan: { required: true, minLength: 8, message: 'Please enter a slogan.' }
})

const fillForm = (settingsData: typeof settings) => {
  form.clubNameZh = settingsData.clubNameZh
  form.clubNameEn = settingsData.clubNameEn
  form.email = settingsData.email
  form.phone = settingsData.phone
  form.facebookUrl = settingsData.facebookUrl
  form.instagramUrl = settingsData.instagramUrl
  form.slogan = settingsData.slogan
}

onMounted(async () => {
  submitError.value = ''
  try {
    fillForm(await repository.getSettings())
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Unable to load settings.'
  } finally {
    isLoading.value = false
  }
})

const handleSubmit = async () => {
  submitError.value = ''
  submitMessage.value = ''
  if (!validate(form)) return

  isSubmitting.value = true
  try {
    await repository.updateSettings({
      clubNameZh: form.clubNameZh,
      clubNameEn: form.clubNameEn,
      email: form.email,
      phone: form.phone,
      facebookUrl: form.facebookUrl,
      instagramUrl: form.instagramUrl,
      slogan: form.slogan
    })
    submitMessage.value = repository.isSupabaseConfigured
      ? 'Settings saved to Supabase.'
      : 'Settings saved to the local mock store.'
  } catch {
    submitError.value = 'Unable to save settings. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AdminAdminFormSection title="網站設定" description="站名、社群連結與聯絡資訊。">
    <p v-if="submitError" class="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {{ submitError }}
    </p>
    <p v-if="submitMessage" class="mb-5 rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal">
      {{ submitMessage }}
    </p>

    <CommonLoadingState v-if="isLoading" />
    <form v-else class="grid gap-5" novalidate @submit.prevent="handleSubmit">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-2 text-sm font-semibold text-ink">
          中文名稱
          <input v-model="form.clubNameZh" class="focus-ring h-11 rounded-md border px-3" :class="errors.clubNameZh ? 'border-red-300' : 'border-slate-200'" @input="clearError('clubNameZh')" />
          <span v-if="errors.clubNameZh" class="text-xs font-semibold text-red-600">{{ errors.clubNameZh }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          英文名稱
          <input v-model="form.clubNameEn" class="focus-ring h-11 rounded-md border px-3" :class="errors.clubNameEn ? 'border-red-300' : 'border-slate-200'" @input="clearError('clubNameEn')" />
          <span v-if="errors.clubNameEn" class="text-xs font-semibold text-red-600">{{ errors.clubNameEn }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          Email
          <input v-model="form.email" class="focus-ring h-11 rounded-md border px-3" :class="errors.email ? 'border-red-300' : 'border-slate-200'" @input="clearError('email')" />
          <span v-if="errors.email" class="text-xs font-semibold text-red-600">{{ errors.email }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          Phone
          <input v-model="form.phone" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          Facebook
          <input v-model="form.facebookUrl" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          Instagram
          <input v-model="form.instagramUrl" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
        </label>
      </div>
      <label class="grid gap-2 text-sm font-semibold text-ink">
        Slogan
        <textarea v-model="form.slogan" class="focus-ring min-h-24 rounded-md border p-3" :class="errors.slogan ? 'border-red-300' : 'border-slate-200'" @input="clearError('slogan')" />
        <span v-if="errors.slogan" class="text-xs font-semibold text-red-600">{{ errors.slogan }}</span>
      </label>
      <div class="flex justify-end">
        <CommonBaseButton type="submit" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
          {{ isSubmitting ? '儲存中' : '儲存設定' }}
        </CommonBaseButton>
      </div>
    </form>
  </AdminAdminFormSection>
</template>
