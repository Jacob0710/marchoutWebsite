<script setup lang="ts">
import { academicYears, activityTypeLabels } from '~/utils/mockData'

defineProps<{
  search: string
  year: number | 'all'
  type: string
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:year': [value: number | 'all']
  'update:type': [value: string]
}>()

const typeItems = [
  { label: '全部類型', value: 'all' },
  ...Object.entries(activityTypeLabels).map(([value, label]) => ({ value, label }))
]
</script>

<template>
  <div class="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <CommonSearchInput
      :model-value="search"
      placeholder="搜尋活動、地點或標籤"
      @update:model-value="emit('update:search', $event)"
    />
    <CommonYearTabs :years="academicYears" :model-value="year" @update:model-value="emit('update:year', $event)" />
    <CommonCategoryTabs :items="typeItems" :model-value="type" @update:model-value="emit('update:type', $event)" />
  </div>
</template>
