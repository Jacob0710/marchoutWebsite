<script setup lang="ts">
import { ImagePlus, Loader2, Save, Send, Undo2 } from 'lucide-vue-next'
import type { AdminPost } from '~/types/coreContent'
import { toContentSlug } from '~/shared/contentRules'

const props = defineProps<{ item?: AdminPost }>()
const api = useCoreContentAdmin()
const router = useRouter()
const form = reactive({
  title: props.item?.title ?? '', slug: props.item?.slug ?? '', excerpt: props.item?.excerpt ?? '',
  content: props.item?.content ?? '', coverAlt: props.item?.coverAlt ?? '', isFeatured: props.item?.isFeatured ?? false
})
const current = ref(props.item)
const initial = ref(JSON.stringify(form))
const pending = ref(false)
const uploadPending = ref(false)
const message = ref('')
const error = ref('')
const confirmAction = ref<'publish' | 'unpublish' | null>(null)
const dirty = computed(() => JSON.stringify(form) !== initial.value)

const syncSlug = () => { if (!current.value && !form.slug) form.slug = toContentSlug(form.title) }
const save = async () => {
  pending.value = true; error.value = ''; message.value = ''
  try {
    const payload = { ...form }
    const result = current.value ? await api.updatePost(current.value.id, payload) : await api.createPost(payload)
    current.value = result.item
    Object.assign(form, { title: result.item.title, slug: result.item.slug, excerpt: result.item.excerpt, content: result.item.content, coverAlt: result.item.coverAlt, isFeatured: result.item.isFeatured })
    initial.value = JSON.stringify(form)
    message.value = '草稿已儲存。'
    if (!props.item) await router.replace(`/admin/posts/edit/${result.item.id}`)
  } catch (reason) { error.value = api.errorMessage(reason) } finally { pending.value = false }
}

const changeStatus = async () => {
  if (!current.value || !confirmAction.value) return
  pending.value = true; error.value = ''
  try {
    const result = await api.mutate<{ item: AdminPost }>(`/api/admin/posts/${current.value.id}/${confirmAction.value}`)
    current.value = result.item
    message.value = confirmAction.value === 'publish' ? '消息已發布。' : '消息已撤回。'
    confirmAction.value = null
  } catch (reason) { error.value = api.errorMessage(reason) } finally { pending.value = false }
}

const uploadCover = async (event: Event) => {
  if (!current.value) return
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadPending.value = true; error.value = ''
  try {
    const body = new FormData(); body.append('file', file); body.append('altText', form.coverAlt)
    const result = await api.upload<{ item: AdminPost }>(`/api/admin/posts/${current.value.id}/cover`, body)
    current.value = result.item; message.value = '封面已更新。'
  } catch (reason) { error.value = api.errorMessage(reason) } finally { uploadPending.value = false; input.value = '' }
}

const removeCover = async () => {
  if (!current.value) return
  pending.value = true
  try { current.value = (await api.mutate<{ item: AdminPost }>(`/api/admin/posts/${current.value.id}/cover`, 'DELETE')).item; message.value = '封面已移除。' }
  catch (reason) { error.value = api.errorMessage(reason) } finally { pending.value = false }
}

onBeforeRouteLeave(() => !dirty.value || window.confirm('尚有未儲存的變更，確定要離開嗎？'))
const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.value) event.preventDefault() }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <form class="grid gap-6" novalidate @submit.prevent="save">
    <p v-if="error" id="post-form-error" role="alert" class="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>
    <p v-if="message" class="rounded-md bg-teal/10 p-3 text-sm font-semibold text-teal">{{ message }}</p>
    <AdminFormSection title="消息內容" description="內容以純文字安全呈現，不接受 HTML。">
      <div class="grid gap-4">
        <label class="grid gap-2 text-sm font-semibold">標題<input v-model="form.title" required maxlength="160" class="focus-ring h-11 rounded-md border border-slate-200 px-3" aria-describedby="post-form-error" @blur="syncSlug" /></label>
        <label class="grid gap-2 text-sm font-semibold">Slug<input v-model="form.slug" required maxlength="180" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label>
        <label class="grid gap-2 text-sm font-semibold">摘要<textarea v-model="form.excerpt" maxlength="500" class="focus-ring min-h-24 rounded-md border border-slate-200 p-3" /></label>
        <label class="grid gap-2 text-sm font-semibold">正文<textarea v-model="form.content" required maxlength="100000" class="focus-ring min-h-72 rounded-md border border-slate-200 p-3" /></label>
        <label class="grid gap-2 text-sm font-semibold">封面替代文字<input v-model="form.coverAlt" maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label>
        <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.isFeatured" type="checkbox" class="size-4" />首頁精選</label>
      </div>
    </AdminFormSection>
    <AdminFormSection v-if="current" title="私有封面" description="JPG、PNG、WebP，最大 10 MB。">
      <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label class="grid gap-2 text-sm font-semibold">選擇圖片<input type="file" accept="image/jpeg,image/png,image/webp" class="focus-ring rounded-md border border-slate-200 p-2" :disabled="uploadPending" @change="uploadCover" /></label>
        <button v-if="current.hasCover" type="button" class="focus-ring rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700" @click="removeCover">移除封面</button>
      </div>
    </AdminFormSection>
    <div class="flex flex-wrap justify-end gap-3">
      <button type="submit" class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-bold text-white" :disabled="pending"><Loader2 v-if="pending" class="size-4 animate-spin" /><Save v-else class="size-4" />儲存草稿</button>
      <button v-if="current?.status === 'draft'" type="button" class="focus-ring inline-flex items-center gap-2 rounded-md bg-coral px-5 py-3 font-bold text-white" :disabled="pending || dirty" @click="confirmAction = 'publish'"><Send class="size-4" />發布</button>
      <button v-if="current?.status === 'published'" type="button" class="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-300 px-5 py-3 font-bold" :disabled="pending || dirty" @click="confirmAction = 'unpublish'"><Undo2 class="size-4" />撤回</button>
    </div>
  </form>
  <AdminConfirmModal :open="Boolean(confirmAction)" :title="confirmAction === 'publish' ? '發布消息' : '撤回消息'" :message="confirmAction === 'publish' ? '發布後訪客可立即查看這則消息。' : '撤回後公開網址會立即變成 404。'" confirm-label="確認" :is-loading="pending" :error="error" @cancel="confirmAction = null" @confirm="changeStatus" />
</template>
