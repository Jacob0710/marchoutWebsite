<script setup lang="ts">
import { KeyRound, RefreshCw } from 'lucide-vue-next'
import type { AdminAccount, AdminInvitation, CreateAdminInvitationInput, CreateAdminInvitationResponse } from '~/types/adminAccess'

definePageMeta({ layout: 'admin' })
useSeo({ title: '管理員存取權', description: '管理後台邀請、管理員狀態與存取權稽核。' })

const { data, pending, error, refresh } = await useAdminAccess()
const mutations = useAdminAccessMutations()
const inviteBusy = ref(false)
const inviteError = ref('')
const inviteResetKey = ref(0)
const inviteResult = ref<CreateAdminInvitationResponse | null>(null)
const pendingAction = ref<{ type: 'revoke'; invitation: AdminInvitation } | { type: 'set-active'; admin: AdminAccount; isActive: boolean } | null>(null)
const actionBusy = ref(false)
const actionError = ref('')
const busyUserId = computed(() => actionBusy.value && pendingAction.value?.type === 'set-active' ? pendingAction.value.admin.userId : '')
const busyInvitationId = computed(() => actionBusy.value && pendingAction.value?.type === 'revoke' ? pendingAction.value.invitation.id : '')

const createInvitation = async (input: CreateAdminInvitationInput) => {
  if (inviteBusy.value) return
  inviteBusy.value = true
  inviteError.value = ''
  try {
    inviteResult.value = await mutations.createInvitation(input)
    inviteResetKey.value += 1
    await refresh()
  } catch (caught) {
    inviteError.value = getAdminApiMessage(caught)
  } finally {
    inviteBusy.value = false
  }
}

const runAction = async () => {
  if (!pendingAction.value || actionBusy.value) return
  actionBusy.value = true
  actionError.value = ''
  try {
    if (pendingAction.value.type === 'revoke') {
      await mutations.revokeInvitation(pendingAction.value.invitation.id)
    } else {
      await mutations.setAdminActive(pendingAction.value.admin.userId, pendingAction.value.isActive)
    }
    pendingAction.value = null
    await refresh()
  } catch (caught) {
    actionError.value = getAdminApiMessage(caught)
  } finally {
    actionBusy.value = false
  }
}

const confirmTitle = computed(() => pendingAction.value?.type === 'revoke'
  ? '撤銷管理員邀請'
  : pendingAction.value?.isActive ? '重新啟用管理員' : '停用管理員')
const confirmMessage = computed(() => {
  if (pendingAction.value?.type === 'revoke') return `撤銷 ${pendingAction.value.invitation.email} 的邀請後，原連結立即失效。`
  if (pendingAction.value?.type === 'set-active') return pendingAction.value.isActive
    ? `重新啟用 ${pendingAction.value.admin.email} 的後台存取權。`
    : `停用 ${pendingAction.value.admin.email} 後，其現有 session 將無法再使用管理功能。`
  return ''
})
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
      <div class="flex items-start gap-4"><span class="grid size-11 shrink-0 place-items-center rounded-md bg-teal text-white"><KeyRound class="size-5" aria-hidden="true" /></span><div><h1 class="text-2xl font-bold text-ink">管理員存取權</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted">管理邀請、啟停狀態與不可修改的稽核歷史。Auth 帳號仍由 Supabase Dashboard 管理。</p></div></div>
      <button type="button" class="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold hover:bg-cloud disabled:opacity-50" :disabled="pending" @click="refresh()"><RefreshCw class="size-4" :class="{ 'animate-spin': pending }" />重新整理</button>
    </div>

    <CommonLoadingState v-if="pending && !data.admins.length" />
    <section v-else-if="error" role="alert" class="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">管理員存取權資料暫時無法載入。<button type="button" class="ml-2 underline" @click="refresh()">重試</button></section>
    <template v-else>
      <AdminAccessTable :admins="data.admins" :busy-user-id="busyUserId" @set-active="(admin, isActive) => pendingAction = { type: 'set-active', admin, isActive }" />

      <section class="grid gap-3"><div><h2 class="text-lg font-bold text-ink">建立一次性邀請</h2><p class="mt-1 text-sm text-muted">受邀者需先有相同 Email 的 Supabase Auth 帳號。邀請連結關閉後無法再次取得。</p></div><AdminInvitationForm :is-loading="inviteBusy" :error="inviteError" :reset-key="inviteResetKey" @submit="createInvitation" /></section>

      <CommonEmptyState v-if="!data.invitations.length" title="尚無管理員邀請" description="建立後，一次性連結只會在結果視窗顯示。" />
      <AdminInvitationTable v-else :invitations="data.invitations" :busy-invitation-id="busyInvitationId" @revoke="(invitation) => pendingAction = { type: 'revoke', invitation }" />

      <CommonEmptyState v-if="!data.auditLogs.length" title="尚無存取權稽核紀錄" description="建立邀請或變更管理員狀態後會在此留下紀錄。" />
      <AdminAccessAuditLog v-else :logs="data.auditLogs" />
    </template>

    <AdminInvitationResultDialog :open="Boolean(inviteResult)" :email="inviteResult?.invitation.email ?? ''" :invite-url="inviteResult?.inviteUrl ?? ''" @close="inviteResult = null" />
    <AdminConfirmModal :open="Boolean(pendingAction)" :title="confirmTitle" :message="confirmMessage" confirm-label="確認" cancel-label="取消" :is-loading="actionBusy" :error="actionError" @cancel="pendingAction = null" @confirm="runAction" />
  </div>
</template>
