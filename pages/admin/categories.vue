<script setup lang="ts">
import { activityTypeLabels } from '~/utils/mockData'

definePageMeta({ layout: 'admin' })

const { files } = useMockContent()
const fileCategories = Array.from(new Set(files.map((file) => file.category)))
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <AdminAdminFormSection title="活動分類">
      <div class="grid gap-3">
        <div
          v-for="(label, value) in activityTypeLabels"
          :key="value"
          class="flex items-center justify-between rounded-md bg-cloud px-4 py-3"
        >
          <span class="font-semibold text-ink">{{ label }}</span>
          <span class="text-xs font-bold uppercase text-muted">{{ value }}</span>
        </div>
      </div>
    </AdminAdminFormSection>

    <AdminAdminFormSection title="檔案分類">
      <div class="grid gap-3">
        <div
          v-for="category in fileCategories"
          :key="category"
          class="flex items-center justify-between rounded-md bg-cloud px-4 py-3"
        >
          <span class="font-semibold text-ink">{{ category }}</span>
          <span class="text-xs font-bold text-muted">file</span>
        </div>
      </div>
    </AdminAdminFormSection>
  </div>
</template>
