<script setup lang="ts">
import { Loader2, Plus, Save, Trash2 } from 'lucide-vue-next'
import type { CoreSiteSettings, SiteSettingsInput } from '~/types/coreContent'

definePageMeta({ layout: 'admin' })
const api = useCoreContentAdmin()
const { data, pending, error } = await useFetch<{ item: CoreSiteSettings }>('/api/admin/settings')
const emptyForm = (): SiteSettingsInput => ({
  siteName: '', clubNameZh: '', clubNameEn: '', slogan: '', heroTitle: '', heroSubtitle: '', aboutSummary: '',
  facebookUrl: '', instagramUrl: '', youtubeUrl: '', contactText: '', email: '', phone: '', locations: [],
  defaultSeoTitle: '', defaultSeoDescription: '', footerText: ''
})
const form = reactive<SiteSettingsInput>(emptyForm())
const busy = ref(false)
const pageError = ref('')
const message = ref('')

watchEffect(() => {
  if (!data.value?.item) return
  const { id: _id, logoUrl: _logo, updatedAt: _updated, ...editable } = data.value.item
  Object.assign(form, {
    ...editable,
    locations: editable.locations.map(location => ({ ...location }))
  })
})
const addLocation = () => form.locations.push({ title: '', address: '', mapUrl: '' })
const removeLocation = (index: number) => form.locations.splice(index, 1)
const submit = async () => {
  busy.value = true; pageError.value = ''; message.value = ''
  try {
    const result = await api.updateSettings(form)
    data.value = result
    message.value = '站點設定已更新。'
  } catch (reason) { pageError.value = api.errorMessage(reason) } finally { busy.value = false }
}
</script>

<template><div class="grid gap-6">
  <div><p class="text-sm font-bold text-coral">Site settings</p><h1 class="mt-1 text-3xl font-bold text-ink">站點設定</h1><p class="mt-2 text-sm text-muted">此頁僅保存可公開的網站內容，不得輸入密碼、金鑰、token 或私人名單。</p></div>
  <CommonLoadingState v-if="pending" /><CommonEmptyState v-else-if="error" title="站點設定載入失敗" description="請重新整理頁面。" />
  <form v-else class="grid gap-6" @submit.prevent="submit">
    <p v-if="pageError" role="alert" class="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{{ pageError }}</p><p v-if="message" class="rounded-md bg-teal/10 p-3 text-sm font-semibold text-teal">{{ message }}</p>
    <AdminFormSection title="品牌 Brand"><div class="grid gap-4 md:grid-cols-2"><label class="grid gap-2 text-sm font-semibold">站點名稱<input v-model.trim="form.siteName" required maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">中文社團名稱<input v-model.trim="form.clubNameZh" required maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">英文社團名稱<input v-model.trim="form.clubNameEn" required maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">標語<input v-model.trim="form.slogan" required maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label></div></AdminFormSection>
    <AdminFormSection title="首頁 Homepage"><div class="grid gap-4"><label class="grid gap-2 text-sm font-semibold">主標題<input v-model.trim="form.heroTitle" required maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">副標題<textarea v-model.trim="form.heroSubtitle" maxlength="500" class="focus-ring min-h-24 rounded-md border border-slate-200 p-3" /></label></div></AdminFormSection>
    <AdminFormSection title="關於 About"><label class="grid gap-2 text-sm font-semibold">社團簡介<textarea v-model.trim="form.aboutSummary" maxlength="5000" class="focus-ring min-h-36 rounded-md border border-slate-200 p-3" /></label></AdminFormSection>
    <AdminFormSection title="聯絡 Contact"><div class="grid gap-4 md:grid-cols-2"><label class="grid gap-2 text-sm font-semibold md:col-span-2">聯絡說明<textarea v-model.trim="form.contactText" maxlength="5000" class="focus-ring min-h-24 rounded-md border border-slate-200 p-3" /></label><label class="grid gap-2 text-sm font-semibold">Email<input v-model.trim="form.email" type="email" maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">電話<input v-model.trim="form.phone" maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label></div></AdminFormSection>
    <AdminFormSection title="社群 Social" description="網址必須使用 HTTPS。"><div class="grid gap-4 md:grid-cols-3"><label class="grid gap-2 text-sm font-semibold">Facebook<input v-model.trim="form.facebookUrl" type="url" pattern="https://.*" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">Instagram<input v-model.trim="form.instagramUrl" type="url" pattern="https://.*" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">YouTube<input v-model.trim="form.youtubeUrl" type="url" pattern="https://.*" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label></div></AdminFormSection>
    <AdminFormSection title="地圖位置 Map locations" description="使用結構化欄位管理位置，不直接編輯 JSON。"><div class="grid gap-4"><div v-for="(location, index) in form.locations" :key="index" class="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-[1fr_1.4fr_1.4fr_auto]"><label class="grid gap-2 text-sm font-semibold">名稱<input v-model.trim="location.title" required maxlength="150" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">地址<input v-model.trim="location.address" maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">HTTPS 地圖網址<input v-model.trim="location.mapUrl" type="url" pattern="https://.*" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><button type="button" class="focus-ring mt-7 rounded-md bg-red-50 p-3 text-red-700" :aria-label="`刪除位置 ${index + 1}`" @click="removeLocation(index)"><Trash2 class="size-4" /></button></div><button type="button" class="focus-ring inline-flex w-fit items-center gap-2 rounded-md border px-4 py-2 text-sm font-bold" @click="addLocation"><Plus class="size-4" />新增位置</button></div></AdminFormSection>
    <AdminFormSection title="搜尋與頁尾 SEO / Footer"><div class="grid gap-4"><label class="grid gap-2 text-sm font-semibold">預設 SEO 標題<input v-model.trim="form.defaultSeoTitle" maxlength="300" class="focus-ring h-11 rounded-md border border-slate-200 px-3" /></label><label class="grid gap-2 text-sm font-semibold">預設 SEO 描述<textarea v-model.trim="form.defaultSeoDescription" maxlength="500" class="focus-ring min-h-24 rounded-md border border-slate-200 p-3" /></label><label class="grid gap-2 text-sm font-semibold">頁尾文字<textarea v-model.trim="form.footerText" maxlength="300" class="focus-ring min-h-20 rounded-md border border-slate-200 p-3" /></label></div></AdminFormSection>
    <div class="sticky bottom-4 flex justify-end"><button type="submit" class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3 font-bold text-white shadow-soft" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /><Save v-else class="size-4" />{{ busy ? '儲存中…' : '儲存設定' }}</button></div>
  </form>
</div></template>
