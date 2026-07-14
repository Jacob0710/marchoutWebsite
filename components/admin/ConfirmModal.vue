<script setup lang="ts">
import { Loader2, TriangleAlert, X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    isLoading?: boolean
    error?: string
  }>(),
  {
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    isLoading: false,
    error: ''
  }
)

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-ink/60 px-4 py-8" role="presentation">
        <div
          class="w-full max-w-md rounded-lg bg-white p-5 shadow-soft"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`${title}-modal-title`"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-md bg-coral/10 text-coral">
                <TriangleAlert class="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 :id="`${title}-modal-title`" class="text-lg font-bold text-ink">{{ title }}</h2>
                <p class="mt-2 text-sm leading-6 text-muted">{{ message }}</p>
              </div>
            </div>
            <button
              type="button"
              class="focus-ring grid size-9 shrink-0 place-items-center rounded-md text-muted transition hover:bg-cloud hover:text-ink"
              aria-label="Close dialog"
              :disabled="isLoading"
              @click="emit('cancel')"
            >
              <X class="size-4" aria-hidden="true" />
            </button>
          </div>

          <p v-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {{ error }}
          </p>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="focus-ring rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isLoading"
              @click="emit('cancel')"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="focus-ring inline-flex items-center gap-2 rounded-md bg-coral px-4 py-2 text-sm font-bold text-white transition hover:bg-coralDark disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isLoading"
              @click="emit('confirm')"
            >
              <Loader2 v-if="isLoading" class="size-4 animate-spin" aria-hidden="true" />
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
