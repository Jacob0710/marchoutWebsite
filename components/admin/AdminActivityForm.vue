<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import type { AdminActivity, AdminActivityInput } from '~/types/adminActivity'
import { activityTypeLabels, toActivitySlug } from '~/shared/activityRules'

const props = defineProps<{ activity?: AdminActivity | null }>()
const emit = defineEmits<{ saved: [activity: AdminActivity]; deleted: [] }>()
const mutations = useAdminActivityMutations()
const currentYear = Math.max(1, new Date().getFullYear() - 1911)
const form = reactive<AdminActivityInput>({
  title: '', slug: '', academicYear: currentYear, activityType: 'regular', eventDate: null,
  location: null, participantsCount: 0, resultSummary: null, content: null, isFeatured: false, tags: []
})
const fieldErrors = ref<Record<string, string[]>>({})
const message = ref('')
const errorMessage = ref('')
const action = ref<'save' | 'publish' | 'unpublish' | 'delete' | null>(null)
const confirmAction = ref<'publish' | 'unpublish' | 'delete' | null>(null)
const dirty = ref(false)
let hydrating = true

const fill = (activity?: AdminActivity | null) => {
  if (!activity) return
  Object.assign(form, {
    title: activity.title, slug: activity.slug, academicYear: activity.academicYear,
    activityType: activity.activityType, eventDate: activity.eventDate, location: activity.location,
    participantsCount: activity.participantsCount, resultSummary: activity.resultSummary,
    content: activity.content, isFeatured: activity.isFeatured, tags: [...activity.tags]
  })
  dirty.value = false
}
fill(props.activity)
watch(() => props.activity, fill)
watch(form, () => { if (!hydrating) dirty.value = true }, { deep: true })
onMounted(() => { hydrating = false })

const payload = (): AdminActivityInput => ({
  ...form,
  title: form.title.trim(),
  slug: form.slug?.trim() || undefined,
  location: form.location?.trim() || null,
  resultSummary: form.resultSummary?.trim() || null,
  content: form.content?.trim() || null,
  tags: form.tags?.map((tag) => tag.trim()).filter(Boolean) ?? []
})

const save = async () => {
  action.value = 'save'; message.value = ''; errorMessage.value = ''; fieldErrors.value = {}
  try {
    const response = props.activity
      ? await mutations.update(props.activity.id, payload())
      : await mutations.create(payload())
    dirty.value = false
    message.value = '草稿已儲存。'
    emit('saved', response.activity)
    return response.activity
  } catch (error) {
    fieldErrors.value = getAdminApiFieldErrors(error)
    errorMessage.value = getAdminApiMessage(error, '無法儲存活動。')
    return null
  } finally { action.value = null }
}

const runConfirmed = async () => {
  if (!confirmAction.value || !props.activity) return
  const selected = confirmAction.value
  action.value = selected; errorMessage.value = ''; fieldErrors.value = {}
  try {
    if (selected === 'delete') {
      await mutations.remove(props.activity.id)
      dirty.value = false
      emit('deleted')
      return
    }
    if (dirty.value) {
      const saved = await save()
      if (!saved) return
    }
    const response = selected === 'publish'
      ? await mutations.publish(props.activity.id)
      : await mutations.unpublish(props.activity.id)
    message.value = selected === 'publish' ? '活動已發布。' : '活動已撤回為草稿。'
    emit('saved', response.activity)
  } catch (error) {
    fieldErrors.value = getAdminApiFieldErrors(error)
    errorMessage.value = getAdminApiMessage(error)
  } finally { action.value = null; confirmAction.value = null }
}

const tagsText = computed({
  get: () => form.tags?.join(', ') ?? '',
  set: (value: string) => { form.tags = value.split(',').map((tag) => tag.trim()).filter(Boolean) }
})
const suggestSlug = () => { if (!form.slug) form.slug = toActivitySlug(form.title) }

onBeforeRouteLeave(() => {
  if (!dirty.value || !import.meta.client) return true
  return window.confirm('尚有未儲存的變更，確定要離開嗎？')
})
</script>

<template>
  <AdminFormSection title="活動內容" description="草稿只需標題；發布前必須填妥日期、地點、成果與正文。">
    <p v-if="message" class="mb-5 rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal">{{ message }}</p>
    <p v-if="errorMessage" class="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{{ errorMessage }}</p>
    <form class="grid gap-5" novalidate @submit.prevent="save">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-2 text-sm font-semibold">活動標題
          <input v-model="form.title" class="focus-ring h-11 rounded-md border border-slate-200 px-3" @blur="suggestSlug" />
          <span v-if="fieldErrors.title" class="text-xs text-red-600">{{ fieldErrors.title[0] }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold">Slug
          <input v-model="form.slug" class="focus-ring h-11 rounded-md border border-slate-200 px-3 font-mono" placeholder="activity-slug" />
          <span v-if="fieldErrors.slug" class="text-xs text-red-600">{{ fieldErrors.slug[0] }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold">學年度
          <input v-model.number="form.academicYear" type="number" min="1" max="999" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
          <span v-if="fieldErrors.academicYear" class="text-xs text-red-600">{{ fieldErrors.academicYear[0] }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold">活動分類
          <select v-model="form.activityType" class="focus-ring h-11 rounded-md border border-slate-200 px-3">
            <option v-for="(label, value) in activityTypeLabels" :key="value" :value="value">{{ label }}</option>
          </select>
        </label>
        <label class="grid gap-2 text-sm font-semibold">活動日期
          <input v-model="form.eventDate" type="date" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
          <span v-if="fieldErrors.eventDate" class="text-xs text-red-600">{{ fieldErrors.eventDate[0] }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold">地點
          <input v-model="form.location" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
          <span v-if="fieldErrors.location" class="text-xs text-red-600">{{ fieldErrors.location[0] }}</span>
        </label>
        <label class="grid gap-2 text-sm font-semibold">參與人數
          <input v-model.number="form.participantsCount" type="number" min="0" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
        </label>
        <label class="grid gap-2 text-sm font-semibold">標籤（逗號分隔）
          <input v-model="tagsText" class="focus-ring h-11 rounded-md border border-slate-200 px-3" />
        </label>
      </div>
      <label class="grid gap-2 text-sm font-semibold">活動成果摘要
        <textarea v-model="form.resultSummary" class="focus-ring min-h-24 rounded-md border border-slate-200 p-3" />
        <span v-if="fieldErrors.resultSummary" class="text-xs text-red-600">{{ fieldErrors.resultSummary[0] }}</span>
      </label>
      <label class="grid gap-2 text-sm font-semibold">活動正文
        <textarea v-model="form.content" class="focus-ring min-h-44 rounded-md border border-slate-200 p-3" />
        <span v-if="fieldErrors.content" class="text-xs text-red-600">{{ fieldErrors.content[0] }}</span>
      </label>
      <label class="inline-flex items-center gap-2 text-sm font-semibold"><input v-model="form.isFeatured" type="checkbox" class="size-4" />首頁精選</label>
      <div class="flex flex-wrap justify-end gap-3">
        <CommonBaseButton to="/admin/activities" variant="secondary">返回列表</CommonBaseButton>
        <CommonBaseButton type="submit" :disabled="Boolean(action)"><Loader2 v-if="action === 'save'" class="size-4 animate-spin" />儲存草稿</CommonBaseButton>
        <template v-if="activity">
          <CommonBaseButton v-if="activity.status === 'draft'" type="button" :disabled="Boolean(action)" @click="confirmAction = 'publish'">發布</CommonBaseButton>
          <CommonBaseButton v-else type="button" variant="secondary" :disabled="Boolean(action)" @click="confirmAction = 'unpublish'">撤回</CommonBaseButton>
          <button type="button" class="focus-ring rounded-md px-5 py-3 text-sm font-bold text-red-700" :disabled="Boolean(action)" @click="confirmAction = 'delete'">刪除</button>
        </template>
      </div>
    </form>
    <AdminConfirmModal
      :open="Boolean(confirmAction)"
      :title="confirmAction === 'delete' ? '刪除活動' : confirmAction === 'publish' ? '發布活動' : '撤回活動'"
      :message="confirmAction === 'delete' ? `「${activity?.title}」及其資產將永久刪除。` : confirmAction === 'publish' ? '發布後活動與資產會立即公開。' : '撤回後公開頁面與資產會立即不可見。'"
      :confirm-label="confirmAction === 'delete' ? '永久刪除' : confirmAction === 'publish' ? '確認發布' : '確認撤回'"
      cancel-label="取消"
      :is-loading="Boolean(action)"
      @cancel="confirmAction = null"
      @confirm="runConfirmed"
    />
  </AdminFormSection>
</template>
