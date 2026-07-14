<script setup lang="ts">
import { Search } from 'lucide-vue-next'

defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="relative block">
    <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    <input
      :value="modelValue"
      type="search"
      :placeholder="placeholder ?? '搜尋'"
      class="focus-ring h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm text-ink shadow-sm"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>
