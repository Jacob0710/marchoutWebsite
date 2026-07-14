<script setup lang="ts">
import { Loader2, Trash2 } from 'lucide-vue-next'
import type { FAQItem } from '~/types/content'

definePageMeta({ layout: 'admin' })

const { faq } = useMockContent()
const repository = useAdminRepository()
const tableFaq = ref<FAQItem[]>([])
const isLoading = ref(true)
const pageError = ref('')
const form = reactive({
  question: '',
  answer: ''
})
const isSubmitting = ref(false)
const submitError = ref('')
const submitMessage = ref('')
const deleteTarget = ref<FAQItem | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')

const { errors, validate, clearError } = useFormValidation<typeof form>({
  question: { required: true, minLength: 4, message: 'Please enter a question.' },
  answer: { required: true, minLength: 8, message: 'Please enter an answer.' }
})

const loadFaq = async () => {
  isLoading.value = true
  pageError.value = ''
  try {
    tableFaq.value = await repository.listFaq()
  } catch (error) {
    tableFaq.value = [...faq]
    pageError.value = error instanceof Error ? error.message : 'Unable to load FAQ.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadFaq()
})

const handleSubmit = async () => {
  submitError.value = ''
  submitMessage.value = ''
  if (!validate(form)) return

  isSubmitting.value = true
  try {
    const created = await repository.createFaq({
      question: form.question,
      answer: form.answer,
      sortOrder: tableFaq.value.length + 1,
      isVisible: true
    })
    tableFaq.value = [...tableFaq.value, created]
    form.question = ''
    form.answer = ''
    submitMessage.value = repository.isSupabaseConfigured
      ? 'FAQ saved to Supabase.'
      : 'FAQ saved to the local mock store.'
  } catch {
    submitError.value = 'Unable to add this FAQ. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

const requestDelete = (item: FAQItem) => {
  deleteTarget.value = item
  deleteError.value = ''
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await repository.deleteFaq(deleteTarget.value.id)
    tableFaq.value = tableFaq.value.filter((item) => item.id !== deleteTarget.value?.id)
    deleteTarget.value = null
  } catch {
    deleteError.value = 'Unable to delete this FAQ. Please try again.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="grid gap-6">
    <AdminAdminFormSection title="新增 FAQ">
      <p v-if="submitError" class="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {{ submitError }}
      </p>
      <p v-if="submitMessage" class="mb-5 rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal">
        {{ submitMessage }}
      </p>

      <form class="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-start" novalidate @submit.prevent="handleSubmit">
        <label class="grid gap-2 text-sm font-semibold text-ink">
          問題
          <input
            v-model="form.question"
            class="focus-ring h-11 rounded-md border px-3"
            :class="errors.question ? 'border-red-300' : 'border-slate-200'"
            @input="clearError('question')"
          />
          <span v-if="errors.question" class="text-xs font-semibold text-red-600">{{ errors.question }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          回答
          <input
            v-model="form.answer"
            class="focus-ring h-11 rounded-md border px-3"
            :class="errors.answer ? 'border-red-300' : 'border-slate-200'"
            @input="clearError('answer')"
          />
          <span v-if="errors.answer" class="text-xs font-semibold text-red-600">{{ errors.answer }}</span>
        </label>
        <CommonBaseButton type="submit" :disabled="isSubmitting" class="md:mt-7">
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
          {{ isSubmitting ? '新增中' : '新增' }}
        </CommonBaseButton>
      </form>
    </AdminAdminFormSection>

    <p v-if="pageError" class="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {{ pageError }}
    </p>

    <CommonLoadingState v-if="isLoading" />

    <AdminAdminDataTable v-else title="FAQ 管理">
      <thead class="bg-cloud text-left text-xs font-bold uppercase tracking-wide text-muted">
        <tr>
          <th class="px-5 py-3">排序</th>
          <th class="px-5 py-3">問題</th>
          <th class="px-5 py-3">顯示</th>
          <th class="px-5 py-3">操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr v-for="item in tableFaq" :key="item.id">
          <td class="px-5 py-4 text-muted">{{ item.sortOrder }}</td>
          <td class="px-5 py-4">
            <p class="font-semibold text-ink">{{ item.question }}</p>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-muted">{{ item.answer }}</p>
          </td>
          <td class="px-5 py-4">
            <span class="rounded-md bg-teal/10 px-2.5 py-1 text-xs font-bold text-teal">
              {{ item.isVisible ? '顯示' : '隱藏' }}
            </span>
          </td>
          <td class="px-5 py-4">
            <button
              type="button"
              class="focus-ring inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
              @click="requestDelete(item)"
            >
              <Trash2 class="size-4" aria-hidden="true" />
              刪除
            </button>
          </td>
        </tr>
        <tr v-if="!tableFaq.length">
          <td colspan="4" class="px-5 py-8 text-center text-sm text-muted">目前沒有 FAQ 資料。</td>
        </tr>
      </tbody>
    </AdminAdminDataTable>

    <AdminConfirmModal
      :open="Boolean(deleteTarget)"
      title="刪除 FAQ"
      :message="`確定要刪除「${deleteTarget?.question ?? ''}」嗎？這個動作目前只會影響本頁 mock 狀態。`"
      confirm-label="刪除"
      cancel-label="取消"
      :is-loading="isDeleting"
      :error="deleteError"
      @cancel="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
