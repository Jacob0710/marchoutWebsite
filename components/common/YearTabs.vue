<script setup lang="ts">
defineProps<{
  years: number[]
  modelValue?: number | 'all'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | 'all']
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2" role="group" aria-label="依學年度篩選">
    <button
      type="button"
      class="focus-ring rounded-md px-3 py-2 text-sm font-semibold transition"
      :class="modelValue === 'all' || !modelValue ? 'bg-ink text-white' : 'bg-white text-slate-700 hover:bg-cloud'"
      :aria-pressed="modelValue === 'all' || !modelValue"
      @click="emit('update:modelValue', 'all')"
    >
      全部
    </button>
    <button
      v-for="year in years"
      :key="year"
      type="button"
      class="focus-ring rounded-md px-3 py-2 text-sm font-semibold transition"
      :class="modelValue === year ? 'bg-ink text-white' : 'bg-white text-slate-700 hover:bg-cloud'"
      :aria-pressed="modelValue === year"
      @click="emit('update:modelValue', year)"
    >
      {{ year }}
    </button>
  </div>
</template>
