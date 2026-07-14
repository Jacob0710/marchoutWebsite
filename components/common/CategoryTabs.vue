<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; value: string }>
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="focus-ring rounded-md px-3 py-2 text-sm font-semibold transition"
      :class="modelValue === item.value ? 'bg-teal text-white' : 'bg-white text-slate-700 hover:bg-cloud'"
      @click="emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
