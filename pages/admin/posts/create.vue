<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import type { ContentStatus } from '~/types/content'

definePageMeta({ layout: 'admin' })

const form = reactive({
  title: '',
  slug: '',
  publishedAt: '',
  status: 'draft' as ContentStatus,
  coverImageUrl: '',
  excerpt: '',
  content: ''
})

const isSubmitting = ref(false)
const submitError = ref('')
const submitMessage = ref('')
const repository = useAdminRepository()

const { errors, validate, clearError } = useFormValidation<typeof form>({
  title: { required: true, minLength: 2, message: 'Please enter a post title.' },
  slug: {
    required: true,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    message: 'Use lowercase letters, numbers, and hyphens only.'
  },
  publishedAt: { required: true, message: 'Please choose a publish date.' },
  excerpt: { required: true, minLength: 10, message: 'Please enter a short excerpt.' },
  content: { required: true, minLength: 20, message: 'Please enter post content.' }
})

const handleSubmit = async () => {
  submitError.value = ''
  submitMessage.value = ''
  if (!validate(form)) return

  isSubmitting.value = true
  try {
    await repository.createPost({
      title: form.title,
      slug: form.slug,
      publishedAt: form.publishedAt,
      status: form.status,
      coverImageUrl: form.coverImageUrl,
      excerpt: form.excerpt,
      content: form.content
    })
    submitMessage.value = repository.isSupabaseConfigured
      ? 'Post saved to Supabase.'
      : 'Post saved to the local mock store.'
  } catch {
    submitError.value = 'Unable to save this post. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AdminAdminFormSection title="新增消息" description="建立公告、招募資訊或成果更新。">
    <p v-if="submitError" class="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {{ submitError }}
    </p>
    <p v-if="submitMessage" class="mb-5 rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal">
      {{ submitMessage }}
    </p>

    <form class="grid gap-5" novalidate @submit.prevent="handleSubmit">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-2 text-sm font-semibold text-ink">
          標題
          <input v-model="form.title" class="focus-ring h-11 rounded-md border px-3" :class="errors.title ? 'border-red-300' : 'border-slate-200'" placeholder="消息標題" @input="clearError('title')" />
          <span v-if="errors.title" class="text-xs font-semibold text-red-600">{{ errors.title }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          Slug
          <input v-model="form.slug" class="focus-ring h-11 rounded-md border px-3" :class="errors.slug ? 'border-red-300' : 'border-slate-200'" placeholder="news-slug" @input="clearError('slug')" />
          <span v-if="errors.slug" class="text-xs font-semibold text-red-600">{{ errors.slug }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold text-ink">
          發布時間
          <input v-model="form.publishedAt" type="datetime-local" class="focus-ring h-11 rounded-md border px-3" :class="errors.publishedAt ? 'border-red-300' : 'border-slate-200'" @input="clearError('publishedAt')" />
          <span v-if="errors.publishedAt" class="text-xs font-semibold text-red-600">{{ errors.publishedAt }}</span>
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
        摘要
        <textarea v-model="form.excerpt" class="focus-ring min-h-24 rounded-md border p-3" :class="errors.excerpt ? 'border-red-300' : 'border-slate-200'" @input="clearError('excerpt')" />
        <span v-if="errors.excerpt" class="text-xs font-semibold text-red-600">{{ errors.excerpt }}</span>
      </label>
      <label class="grid gap-2 text-sm font-semibold text-ink">
        內文
        <textarea v-model="form.content" class="focus-ring min-h-48 rounded-md border p-3" :class="errors.content ? 'border-red-300' : 'border-slate-200'" @input="clearError('content')" />
        <span v-if="errors.content" class="text-xs font-semibold text-red-600">{{ errors.content }}</span>
      </label>
      <div class="flex justify-end gap-3">
        <CommonBaseButton to="/admin/posts" variant="secondary">取消</CommonBaseButton>
        <CommonBaseButton type="submit" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
          {{ isSubmitting ? '儲存中' : '儲存消息' }}
        </CommonBaseButton>
      </div>
    </form>
  </AdminAdminFormSection>
</template>
