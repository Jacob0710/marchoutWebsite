<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import type { ActivityType, ContentStatus } from '~/types/content'
import { academicYears, activityTypeLabels } from '~/utils/mockData'

definePageMeta({ layout: 'admin' })

const form = reactive({
  title: '',
  slug: '',
  academicYear: academicYears.at(-1) ?? 114,
  activityType: 'regular' as ActivityType,
  eventDate: '',
  location: '',
  participantsCount: 0,
  resultSummary: '',
  content: '',
  coverImageUrl: '',
  videoUrl: '',
  status: 'draft' as ContentStatus,
  isFeatured: false
})

const isSubmitting = ref(false)
const submitError = ref('')
const submitMessage = ref('')
const repository = useAdminRepository()

const { errors, validate, clearError } = useFormValidation<typeof form>({
  title: { required: true, minLength: 2, message: 'Please enter an activity title.' },
  slug: {
    required: true,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    message: 'Use lowercase letters, numbers, and hyphens only.'
  },
  eventDate: { required: true, message: 'Please choose an event date.' },
  location: { required: true, message: 'Please enter a location.' },
  resultSummary: { required: true, minLength: 10, message: 'Please enter a short result summary.' },
  content: { required: true, minLength: 20, message: 'Please enter activity content.' }
})

const handleSubmit = async () => {
  submitError.value = ''
  submitMessage.value = ''
  if (!validate(form)) return

  isSubmitting.value = true
  try {
    await repository.createActivity({
      title: form.title,
      slug: form.slug,
      academicYear: form.academicYear,
      activityType: form.activityType,
      eventDate: form.eventDate,
      location: form.location,
      participantsCount: form.participantsCount,
      resultSummary: form.resultSummary,
      content: form.content,
      coverImageUrl: form.coverImageUrl,
      videoUrl: form.videoUrl,
      status: form.status,
      isFeatured: form.isFeatured,
      tags: []
    })
    submitMessage.value = repository.isSupabaseConfigured
      ? 'Activity saved to Supabase.'
      : 'Activity saved to the local mock store.'
  } catch {
    submitError.value = 'Unable to save this activity. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="grid gap-6">
    <AdminAdminFormSection title="新增活動" description="建立活動基本資料、成果摘要與展示設定。">
      <p v-if="submitError" class="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {{ submitError }}
      </p>
      <p v-if="submitMessage" class="mb-5 rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal">
        {{ submitMessage }}
      </p>

      <form class="grid gap-5" novalidate @submit.prevent="handleSubmit">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm font-semibold text-ink">
            活動標題
            <input
              v-model="form.title"
              class="focus-ring h-11 rounded-md border px-3"
              :class="errors.title ? 'border-red-300' : 'border-slate-200'"
              placeholder="例如：暑期服務營"
              @input="clearError('title')"
            />
            <span v-if="errors.title" class="text-xs font-semibold text-red-600">{{ errors.title }}</span>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            Slug
            <input
              v-model="form.slug"
              class="focus-ring h-11 rounded-md border px-3"
              :class="errors.slug ? 'border-red-300' : 'border-slate-200'"
              placeholder="summer-service-camp"
              @input="clearError('slug')"
            />
            <span v-if="errors.slug" class="text-xs font-semibold text-red-600">{{ errors.slug }}</span>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            學年度
            <select v-model.number="form.academicYear" class="focus-ring h-11 rounded-md border border-slate-200 px-3">
              <option v-for="year in academicYears" :key="year" :value="year">{{ year }}</option>
            </select>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            活動類型
            <select v-model="form.activityType" class="focus-ring h-11 rounded-md border border-slate-200 px-3">
              <option v-for="(label, value) in activityTypeLabels" :key="value" :value="value">{{ label }}</option>
            </select>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            日期
            <input
              v-model="form.eventDate"
              type="date"
              class="focus-ring h-11 rounded-md border px-3"
              :class="errors.eventDate ? 'border-red-300' : 'border-slate-200'"
              @input="clearError('eventDate')"
            />
            <span v-if="errors.eventDate" class="text-xs font-semibold text-red-600">{{ errors.eventDate }}</span>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            地點
            <input
              v-model="form.location"
              class="focus-ring h-11 rounded-md border px-3"
              :class="errors.location ? 'border-red-300' : 'border-slate-200'"
              placeholder="活動地點"
              @input="clearError('location')"
            />
            <span v-if="errors.location" class="text-xs font-semibold text-red-600">{{ errors.location }}</span>
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            參與人數
            <input v-model.number="form.participantsCount" type="number" min="0" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
          </label>
          <label class="grid gap-2 text-sm font-semibold text-ink">
            狀態
            <select v-model="form.status" class="focus-ring h-11 rounded-md border border-slate-200 px-3">
              <option value="draft">草稿</option>
              <option value="published">已發布</option>
            </select>
          </label>
        </div>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          封面圖片 URL
          <input v-model="form.coverImageUrl" class="focus-ring h-11 rounded-md border border-slate-200 px-3" placeholder="https://..." />
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          YouTube URL
          <input v-model="form.videoUrl" class="focus-ring h-11 rounded-md border border-slate-200 px-3" placeholder="https://www.youtube.com/embed/..." />
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          成果摘要
          <textarea
            v-model="form.resultSummary"
            class="focus-ring min-h-24 rounded-md border p-3"
            :class="errors.resultSummary ? 'border-red-300' : 'border-slate-200'"
            placeholder="簡短說明成果"
            @input="clearError('resultSummary')"
          />
          <span v-if="errors.resultSummary" class="text-xs font-semibold text-red-600">{{ errors.resultSummary }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          內文
          <textarea
            v-model="form.content"
            class="focus-ring min-h-44 rounded-md border p-3"
            :class="errors.content ? 'border-red-300' : 'border-slate-200'"
            placeholder="活動完整紀錄"
            @input="clearError('content')"
          />
          <span v-if="errors.content" class="text-xs font-semibold text-red-600">{{ errors.content }}</span>
        </label>
        <label class="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <input v-model="form.isFeatured" type="checkbox" class="size-4 rounded border-slate-300 text-coral" />
          首頁精選
        </label>
        <div class="flex flex-wrap justify-end gap-3">
          <CommonBaseButton to="/admin/activities" variant="secondary">取消</CommonBaseButton>
          <CommonBaseButton type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
            {{ isSubmitting ? '儲存中' : '儲存活動' }}
          </CommonBaseButton>
        </div>
      </form>
    </AdminAdminFormSection>
  </div>
</template>
