<script setup lang="ts">
import type { AdminActivity } from '~/types/adminActivity'
definePageMeta({ layout: 'admin' })
const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: activity, pending, error, refresh } = await useAdminActivity(id)
useSeo({ title: '編輯活動', description: '編輯活動內容與資產。' })
const saved = async (value: AdminActivity) => { activity.value = value; await refresh() }
const deleted = async () => navigateTo('/admin/activities')
</script>
<template>
  <div class="grid gap-6">
    <CommonLoadingState v-if="pending" />
    <section v-else-if="error || !activity" class="rounded-md bg-red-50 p-4 text-sm text-red-700">找不到活動或資料暫時無法載入。</section>
    <template v-else>
      <AdminActivityForm :activity="activity" @saved="saved" @deleted="deleted" />
      <AdminActivityAssetManager :activity="activity" @refresh="refresh" />
      <AdminActivityVideoManager :activity="activity" @refresh="refresh" />
    </template>
  </div>
</template>
