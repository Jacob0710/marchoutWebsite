<script setup lang="ts">
import { Download, FilePlus2, Loader2, Trash2 } from 'lucide-vue-next'
import type { FileResource } from '~/types/content'
import { academicYears } from '~/utils/mockData'

definePageMeta({ layout: 'admin' })

const { files } = useMockContent()
const repository = useAdminRepository()
const tableFiles = ref<FileResource[]>([])
const isLoading = ref(true)
const pageError = ref('')
const deleteTarget = ref<FileResource | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')
const selectedUpload = ref<File | null>(null)

const form = reactive({
  title: '',
  fileUrl: '',
  fileType: 'PDF',
  academicYear: academicYears.at(-1) ?? 114,
  category: '',
  description: ''
})
const isSubmitting = ref(false)
const submitError = ref('')
const submitMessage = ref('')

const { errors, validate, clearError } = useFormValidation<typeof form>({
  title: { required: true, minLength: 2, message: 'Please enter a file title.' },
  category: { required: true, message: 'Please enter a file category.' },
  description: { required: true, minLength: 6, message: 'Please enter a short description.' }
})

const loadFiles = async () => {
  isLoading.value = true
  pageError.value = ''
  try {
    tableFiles.value = await repository.listFiles()
  } catch (error) {
    tableFiles.value = [...files]
    pageError.value = error instanceof Error ? error.message : 'Unable to load files.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadFiles()
})

const exportFiles = () => {
  if (!import.meta.client) return
  const csv = toCsv(
    tableFiles.value.map((file) => ({
      title: file.title,
      fileType: file.fileType,
      academicYear: file.academicYear ?? '',
      category: file.category,
      createdAt: file.createdAt
    })),
    ['title', 'fileType', 'academicYear', 'category', 'createdAt']
  )
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'files.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const handleUploadChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedUpload.value = input.files?.[0] ?? null
  if (selectedUpload.value && !form.title) {
    form.title = selectedUpload.value.name.replace(/\.[^.]+$/, '')
  }
}

const handleSubmit = async () => {
  submitError.value = ''
  submitMessage.value = ''
  if (!validate(form)) return

  isSubmitting.value = true
  try {
    let fileUrl = form.fileUrl
    if (selectedUpload.value) {
      const safeName = selectedUpload.value.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      fileUrl = await repository.uploadFile('public-files', `${Date.now()}-${safeName}`, selectedUpload.value)
    }

    if (!fileUrl) {
      submitError.value = 'Please provide a file URL or choose a file to upload.'
      return
    }

    const created = await repository.createFile({
      title: form.title,
      fileUrl,
      fileType: form.fileType,
      academicYear: form.academicYear,
      category: form.category,
      description: form.description
    })
    tableFiles.value = [created, ...tableFiles.value]
    form.title = ''
    form.fileUrl = ''
    form.fileType = 'PDF'
    form.category = ''
    form.description = ''
    selectedUpload.value = null
    submitMessage.value = repository.isSupabaseConfigured
      ? 'File saved to Supabase.'
      : 'File saved to the local mock store.'
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Unable to save this file. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

const requestDelete = (file: FileResource) => {
  deleteTarget.value = file
  deleteError.value = ''
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await repository.deleteFile(deleteTarget.value.id)
    tableFiles.value = tableFiles.value.filter((file) => file.id !== deleteTarget.value?.id)
    deleteTarget.value = null
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Unable to delete this file. Please try again.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="grid gap-6">
    <AdminAdminFormSection title="新增檔案" description="可輸入外部 URL，或在 Supabase 已設定時上傳到 Storage。">
      <p v-if="submitError" class="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {{ submitError }}
      </p>
      <p v-if="submitMessage" class="mb-5 rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal">
        {{ submitMessage }}
      </p>
      <form class="grid gap-5" novalidate @submit.prevent="handleSubmit">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm font-semibold text-ink">
            檔案標題
            <input v-model="form.title" class="focus-ring h-11 rounded-md border px-3" :class="errors.title ? 'border-red-300' : 'border-slate-200'" @input="clearError('title')" />
            <span v-if="errors.title" class="text-xs font-semibold text-red-600">{{ errors.title }}</span>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            檔案 URL
            <input v-model="form.fileUrl" class="focus-ring h-11 rounded-md border border-slate-200 px-3" placeholder="https://..." />
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            上傳檔案
            <input type="file" class="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" @change="handleUploadChange" />
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            類型
            <input v-model="form.fileType" class="focus-ring h-11 rounded-md border border-slate-200 px-3" placeholder="PDF" />
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            學年度
            <select v-model.number="form.academicYear" class="focus-ring h-11 rounded-md border border-slate-200 px-3">
              <option v-for="year in academicYears" :key="year" :value="year">{{ year }}</option>
            </select>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            分類
            <input v-model="form.category" class="focus-ring h-11 rounded-md border px-3" :class="errors.category ? 'border-red-300' : 'border-slate-200'" @input="clearError('category')" />
            <span v-if="errors.category" class="text-xs font-semibold text-red-600">{{ errors.category }}</span>
          </label>
        </div>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          描述
          <textarea v-model="form.description" class="focus-ring min-h-24 rounded-md border p-3" :class="errors.description ? 'border-red-300' : 'border-slate-200'" @input="clearError('description')" />
          <span v-if="errors.description" class="text-xs font-semibold text-red-600">{{ errors.description }}</span>
        </label>
        <div class="flex justify-end">
          <CommonBaseButton type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
            <FilePlus2 v-else class="size-4" aria-hidden="true" />
            {{ isSubmitting ? '儲存中' : '新增檔案' }}
          </CommonBaseButton>
        </div>
      </form>
    </AdminAdminFormSection>

    <p v-if="pageError" class="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {{ pageError }}
    </p>

    <CommonLoadingState v-if="isLoading" />

    <AdminAdminDataTable v-else title="檔案管理" description="成果報告、表單與手冊資料。">
      <template #actions>
        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-cloud"
          @click="exportFiles"
        >
          <Download class="size-4" aria-hidden="true" />
          CSV
        </button>
      </template>
      <thead class="bg-cloud text-left text-xs font-bold uppercase tracking-wide text-muted">
        <tr>
          <th class="px-5 py-3">檔案</th>
          <th class="px-5 py-3">年度</th>
          <th class="px-5 py-3">分類</th>
          <th class="px-5 py-3">類型</th>
          <th class="px-5 py-3">操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr v-for="file in tableFiles" :key="file.id">
          <td class="px-5 py-4">
            <p class="font-semibold text-ink">{{ file.title }}</p>
            <p class="mt-1 text-xs text-muted">{{ file.description }}</p>
          </td>
          <td class="px-5 py-4 text-muted">{{ file.academicYear ?? '無' }}</td>
          <td class="px-5 py-4 text-muted">{{ file.category }}</td>
          <td class="px-5 py-4 text-muted">{{ file.fileType }}</td>
          <td class="px-5 py-4">
            <button
              type="button"
              class="focus-ring inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
              @click="requestDelete(file)"
            >
              <Trash2 class="size-4" aria-hidden="true" />
              刪除
            </button>
          </td>
        </tr>
        <tr v-if="!tableFiles.length">
          <td colspan="5" class="px-5 py-8 text-center text-sm text-muted">目前沒有檔案資料。</td>
        </tr>
      </tbody>
    </AdminAdminDataTable>

    <AdminConfirmModal
      :open="Boolean(deleteTarget)"
      title="刪除檔案"
      :message="`確定要刪除「${deleteTarget?.title ?? ''}」嗎？`"
      confirm-label="刪除"
      cancel-label="取消"
      :is-loading="isDeleting"
      :error="deleteError"
      @cancel="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
