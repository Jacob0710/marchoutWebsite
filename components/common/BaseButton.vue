<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

interface Props {
  to?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  disabled: false
})

const classes = {
  primary: 'bg-coral text-white hover:bg-coralDark',
  secondary: 'bg-white text-ink hover:bg-cloud border border-slate-200',
  ghost: 'text-ink hover:bg-white/70'
}
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    v-bind="$attrs"
    class="focus-ring inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold transition"
    :class="classes[variant]"
  >
    <slot />
    <ArrowRight class="size-4" aria-hidden="true" />
  </NuxtLink>
  <button
    v-else
    v-bind="$attrs"
    :type="type"
    :disabled="disabled"
    class="focus-ring inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold transition"
    :class="[classes[variant], disabled ? 'cursor-not-allowed opacity-60' : '']"
  >
    <slot />
  </button>
</template>
