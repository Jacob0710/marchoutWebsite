<script setup lang="ts">
import { ArrowLeft, FileCheck2, Loader2, ShieldAlert, Upload } from 'lucide-vue-next'
import type { EditorialDecision, EditorialReviewUpdateInput, EditorialState } from '~/types/editorial'

definePageMeta({ layout: 'admin' })
useSeo({ title: '逐筆 Editorial 審核', description: 'Phase 10 逐筆內容、隱私與發布證據。' })

const route = useRoute()
const reviewKey = computed(() => String(route.params.reviewKey ?? ''))
const { data, pending, error, refresh } = await useEditorialReview(reviewKey)
const mutations = useEditorialMutations()
const busy = ref(false)
const uploadBusyId = ref('')
const verifyBusy = ref(false)
const verificationOrigin = ref('')
const message = ref('')
const pageError = ref('')
const derivativeFiles = reactive<Record<string, File | null>>({})
const form = reactive<EditorialReviewUpdateInput>({
  state: 'pending', decision: null, decisionReason: '', contentVerified: false,
  privacyVerified: false, authorizationVerified: false, publicTargetVerified: false, targetVersion: ''
})

watch(() => data.value?.item, (item) => {
  if (!item) return
  Object.assign(form, {
    state: item.review.state,
    decision: item.review.decision,
    decisionReason: item.review.decisionReason ?? '',
    contentVerified: item.review.contentVerified,
    privacyVerified: item.review.privacyVerified,
    authorizationVerified: item.review.authorizationVerified,
    publicTargetVerified: item.review.publicTargetVerified,
    targetVersion: item.target?.targetVersion ?? item.redirect?.targetVersion ?? item.review.targetVersion ?? ''
  })
}, { immediate: true })

const isRedirect = computed(() => data.value?.item.review.targetKind === 'redirect')
const decisions = computed<Array<{ value: EditorialDecision; label: string }>>(() => isRedirect.value ? [
  { value: 'activate-redirect', label: '啟用 301（必須已有一跳 200 證據）' },
  { value: 'keep-inactive', label: '維持 inactive' },
  { value: 'archive', label: '封存、不啟用 410' }
] : [
  { value: 'publish', label: '核准發布' },
  { value: 'keep-draft', label: '維持草稿' },
  { value: 'archive', label: '封存' }
])
const terminal = computed(() => ['resolved', 'deferred'].includes(form.state))
const unresolvedRedactions = computed(() => data.value?.item.assets.filter((asset) => asset.privacyState === 'redaction-required') ?? [])

const save = async () => {
  if (busy.value) return
  busy.value = true; pageError.value = ''; message.value = ''
  try {
    const response = await mutations.updateReview(reviewKey.value, { ...form })
    data.value = response
    message.value = '審核證據與決策已寫入 append-only audit。'
    await refresh()
  } catch (caught) { pageError.value = getAdminApiMessage(caught, '審核更新失敗。') } finally { busy.value = false }
}

const chooseDerivative = (assetId: string, event: Event) => {
  derivativeFiles[assetId] = (event.target as HTMLInputElement).files?.[0] ?? null
}
const uploadDerivative = async (assetId: string) => {
  const file = derivativeFiles[assetId]
  if (!file || uploadBusyId.value) return
  uploadBusyId.value = assetId; pageError.value = ''; message.value = ''
  try {
    await mutations.uploadDerivative(reviewKey.value, assetId, file)
    derivativeFiles[assetId] = null
    message.value = '遮蔽副本已以新物件寫入；私有原始檔未被覆寫。'
    await refresh()
  } catch (caught) { pageError.value = getAdminApiMessage(caught, '遮蔽副本上傳失敗。') } finally { uploadBusyId.value = '' }
}
const verifyRedirectTarget = async () => {
  const redirect = data.value?.item.redirect
  if (!redirect || !verificationOrigin.value || verifyBusy.value) return
  verifyBusy.value = true; pageError.value = ''; message.value = ''
  try {
    await mutations.verifyRedirect(redirect.redirectKey, verificationOrigin.value, form.targetVersion)
    message.value = '已由伺服器直接驗證公開目標回應 200。'
    await refresh()
  } catch (caught) { pageError.value = getAdminApiMessage(caught, '公開目標驗證失敗。') } finally { verifyBusy.value = false }
}
const setState = (value: string) => { form.state = value as EditorialState }
</script>

<template>
  <div class="grid gap-6">
    <NuxtLink to="/admin/editorial" class="focus-ring inline-flex w-fit items-center gap-2 rounded-md text-sm font-bold text-teal"><ArrowLeft class="size-4" />返回審核佇列</NuxtLink>
    <CommonLoadingState v-if="pending && !data" />
    <section v-else-if="error || !data" role="alert" class="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">審核不存在、schema 尚未部署或資料暫時無法取得。</section>
    <template v-else>
      <header class="grid gap-3 border-b border-slate-200 pb-6">
        <div class="flex flex-wrap items-center gap-2"><span class="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-bold">{{ data.item.review.reviewKey }}</span><span class="rounded px-2 py-1 text-xs font-bold" :class="data.item.review.severity === 'high' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'">{{ data.item.review.severity }}</span></div>
        <h1 class="text-2xl font-bold text-ink">{{ data.item.target?.targetNaturalKey ?? data.item.redirect?.sourcePath }}</h1>
        <p class="max-w-4xl text-sm leading-6 text-muted">{{ data.item.review.description }}</p>
      </header>

      <section class="grid gap-4 rounded-lg border bg-white p-5">
        <h2 class="text-lg font-bold">來源與 Phase 9 邊界</h2>
        <dl class="grid gap-3 text-sm md:grid-cols-2"><div><dt class="font-bold text-muted">Source key</dt><dd class="mt-1 break-all font-mono text-xs">{{ data.item.review.sourceKey }}</dd></div><div><dt class="font-bold text-muted">Issue</dt><dd class="mt-1 break-words">{{ data.item.review.issueCode }}</dd></div><div><dt class="font-bold text-muted">建議操作</dt><dd class="mt-1 leading-6">{{ data.item.review.recommendedAction }}</dd></div><div><dt class="font-bold text-muted">Phase 9 處置</dt><dd class="mt-1 leading-6">{{ data.item.review.phase9Resolution }}</dd></div></dl>
        <p class="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">禁止依標題或數量補猜缺失內容。沒有授權、內容正確性或隱私證據時，只能維持 draft／inactive。</p>
      </section>

      <section v-if="data.item.assets.length" class="grid gap-4 rounded-lg border bg-white p-5">
        <div><h2 class="text-lg font-bold">私有資產與遮蔽副本</h2><p class="mt-1 text-sm text-muted">公開代理永遠不直接提供標記為 redaction-required 的原始物件。</p></div>
        <article v-for="asset in data.item.assets" :key="asset.id" class="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div><p class="font-bold">{{ asset.originalName }}</p><p class="mt-1 text-xs text-muted">{{ asset.mimeType }} · {{ asset.sizeBytes }} bytes · {{ asset.privacyState }}</p></div>
          <div v-if="asset.privacyState === 'redaction-required'" class="flex flex-wrap items-center gap-2">
            <label class="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold"><Upload class="size-4" />選擇已遮蔽副本<input type="file" class="sr-only" @change="chooseDerivative(asset.id, $event)" /></label>
            <button type="button" class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="!derivativeFiles[asset.id] || Boolean(uploadBusyId)" @click="uploadDerivative(asset.id)"><Loader2 v-if="uploadBusyId === asset.id" class="size-4 animate-spin" /><FileCheck2 v-else class="size-4" />上傳新物件</button>
          </div>
          <span v-else-if="asset.privacyState === 'redacted'" class="inline-flex items-center gap-2 text-sm font-bold text-teal"><FileCheck2 class="size-4" />遮蔽副本已登錄</span>
        </article>
        <p v-if="unresolvedRedactions.length" role="alert" class="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700"><ShieldAlert class="mt-0.5 size-4 shrink-0" />仍有 {{ unresolvedRedactions.length }} 個資產等待不可還原的遮蔽副本，發布會被資料庫拒絕。</p>
      </section>

      <form class="grid gap-5 rounded-lg border bg-white p-5" @submit.prevent="save">
        <div><h2 class="text-lg font-bold">審核決策</h2><p class="mt-1 text-sm text-muted">所有欄位與 target version 會共同形成逐筆發布證據。</p></div>
        <div class="grid gap-4 md:grid-cols-2"><label class="grid gap-2 text-sm font-bold">工作狀態<select :value="form.state" class="focus-ring h-11 rounded-md border px-3" @change="setState(($event.target as HTMLSelectElement).value)"><option value="pending">待審</option><option value="in-review">審核中</option><option value="resolved">已完成</option><option value="deferred">延後</option></select></label><label class="grid gap-2 text-sm font-bold">終局決策<select v-model="form.decision" class="focus-ring h-11 rounded-md border px-3" :required="terminal"><option :value="null">尚未決定</option><option v-for="option in decisions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label></div>
        <label class="grid gap-2 text-sm font-bold">理由與證據摘要<textarea v-model="form.decisionReason" maxlength="4000" :required="terminal" class="focus-ring min-h-32 rounded-md border p-3" placeholder="記錄已核對的來源、授權、隱私處置或延後原因；不得填入真實個資。" /></label>
        <fieldset v-if="!isRedirect" class="grid gap-3"><legend class="mb-2 font-bold">發布 checklist</legend><label class="flex items-start gap-3 text-sm"><input v-model="form.contentVerified" type="checkbox" class="mt-1 size-4" /><span><strong>內容正確性</strong><span class="block text-muted">已逐欄核對來源，不含補猜。</span></span></label><label class="flex items-start gap-3 text-sm"><input v-model="form.privacyVerified" type="checkbox" class="mt-1 size-4" /><span><strong>隱私</strong><span class="block text-muted">個資已移除；需要時已建立不同 hash/path 的遮蔽副本。</span></span></label><label class="flex items-start gap-3 text-sm"><input v-model="form.authorizationVerified" type="checkbox" class="mt-1 size-4" /><span><strong>公開授權</strong><span class="block text-muted">已確認文字、照片與附件可公開。</span></span></label></fieldset>
        <div v-else class="grid gap-3 rounded-md border p-4">
          <p class="text-sm font-bold">伺服器端公開目標證據</p>
          <p class="text-xs text-muted">只允許維運人員預先核准的 HTTPS origin；伺服器不帶 cookie 或權杖直接請求，且只接受無跳轉的 200。</p>
          <div class="flex flex-col gap-2 sm:flex-row"><input v-model="verificationOrigin" type="url" inputmode="url" placeholder="https://staging.example.org" class="focus-ring h-11 min-w-0 flex-1 rounded-md border px-3" /><button type="button" class="focus-ring rounded-md bg-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="verifyBusy || !verificationOrigin" @click="verifyRedirectTarget"><Loader2 v-if="verifyBusy" class="mr-2 inline size-4 animate-spin" />驗證直接 200</button></div>
          <p class="text-xs font-semibold" :class="data.item.redirect?.targetVerified ? 'text-teal' : 'text-amber-700'">{{ data.item.redirect?.targetVerified ? `已驗證 ${data.item.redirect.verifiedOrigin}（${data.item.redirect.verifiedAt}）` : '尚無可接受的 HTTP 證據。' }}</p>
          <label class="flex items-start gap-3 text-sm"><input v-model="form.publicTargetVerified" type="checkbox" class="mt-1 size-4" :disabled="!data.item.redirect?.targetVerified" /><span><strong>公開目標證據</strong><span class="block text-muted">確認上述 origin 與 final target 正是本次核准的公開目標。</span></span></label>
        </div>
        <label class="grid gap-2 text-sm font-bold">Target version<input v-model="form.targetVersion" required readonly class="h-11 rounded-md border bg-cloud px-3 font-mono text-xs" /></label>
        <p v-if="pageError" role="alert" class="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{{ pageError }}</p><p v-if="message" role="status" class="rounded-md bg-teal/10 p-3 text-sm font-semibold text-teal">{{ message }}</p>
        <div class="flex justify-end"><button type="submit" class="focus-ring inline-flex items-center gap-2 rounded-md bg-teal px-5 py-3 font-bold text-white disabled:opacity-50" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /><FileCheck2 v-else class="size-4" />保存逐筆證據</button></div>
      </form>

      <section class="grid gap-3 rounded-lg border bg-white p-5"><h2 class="text-lg font-bold">Append-only audit</h2><p v-if="!data.item.audit.length" class="text-sm text-muted">尚無 Phase 10 audit。</p><ol v-else class="grid gap-2"><li v-for="entry in data.item.audit" :key="entry.id" class="rounded-md bg-cloud p-3 text-sm"><strong>{{ entry.action }}</strong><span class="ml-2 text-xs text-muted">{{ entry.createdAt }} · {{ entry.correlationId }}</span></li></ol></section>
    </template>
  </div>
</template>
