<script setup lang="ts">
import { Check, Copy, X } from 'lucide-vue-next'

const props = defineProps<{ open: boolean; email: string; inviteUrl: string }>()
const emit = defineEmits<{ close: [] }>()
const closeButton = ref<HTMLButtonElement | null>(null)
const copied = ref(false)
watch(() => props.open, async (open) => { copied.value = false; if (open) { await nextTick(); closeButton.value?.focus() } })
const copy = async () => { await navigator.clipboard.writeText(props.inviteUrl); copied.value = true }
const selectUrl = (event: Event) => { if (event.target instanceof HTMLInputElement) event.target.select() }
const onKeydown = (event: KeyboardEvent) => { if (props.open && event.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-ink/60 px-4 py-8" role="presentation">
      <section class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-soft" role="dialog" aria-modal="true" aria-labelledby="invite-result-title">
        <div class="flex items-start justify-between gap-4"><div><p class="text-sm font-bold text-teal">僅顯示這一次</p><h2 id="invite-result-title" class="mt-1 text-xl font-bold text-ink">管理員邀請連結</h2><p class="mt-2 text-sm text-muted">請透過安全管道交給 {{ email }}；關閉後無法再次取得。</p></div><button ref="closeButton" type="button" class="focus-ring grid size-10 place-items-center rounded-md hover:bg-cloud" aria-label="關閉邀請連結" @click="emit('close')"><X class="size-5" /></button></div>
        <label class="mt-5 grid gap-2 text-sm font-bold">一次性連結<input :value="inviteUrl" readonly class="focus-ring h-11 min-w-0 rounded-md border border-slate-200 bg-cloud px-3 font-mono text-xs" @focus="selectUrl" /></label>
        <div class="mt-5 flex justify-end"><button type="button" class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-teal" @click="copy"><Check v-if="copied" class="size-4" /><Copy v-else class="size-4" />{{ copied ? '已複製' : '複製連結' }}</button></div>
      </section>
    </div>
  </Teleport>
</template>
