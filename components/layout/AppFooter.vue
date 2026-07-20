<script setup lang="ts">
import { Facebook, Instagram, Mail, MapPin } from 'lucide-vue-next'
const { data, error } = await usePublicSettings()
const settings = computed(() => data.value?.item)
</script>

<template>
  <footer class="bg-ink text-white">
    <div class="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <p class="text-sm font-semibold text-honey">{{ settings?.clubNameZh || '愛潮關懷社' }}</p>
        <h2 class="mt-2 text-2xl font-bold">{{ settings?.clubNameEn || 'March Out For Love' }}</h2>
        <p class="mt-4 max-w-xl leading-7 text-slate-300">{{ error ? '網站設定暫時無法載入。' : settings?.contactText }}</p>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Site</h3>
        <div class="mt-4 grid gap-2 text-sm text-slate-300">
          <NuxtLink to="/programs" class="hover:text-white">服務計畫</NuxtLink>
          <NuxtLink to="/activities" class="hover:text-white">活動成果</NuxtLink>
          <NuxtLink to="/news" class="hover:text-white">最新消息</NuxtLink>
          <NuxtLink to="/faq" class="hover:text-white">FAQ</NuxtLink>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Contact</h3>
        <div class="mt-4 grid gap-3 text-sm text-slate-300">
          <a v-if="settings?.email" :href="`mailto:${settings.email}`" class="flex items-center gap-2 hover:text-white">
            <Mail class="size-4" aria-hidden="true" />
            {{ settings.email }}
          </a>
          <p v-if="settings?.locations[0]" class="flex items-start gap-2">
            <MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ settings.locations[0].address }}
          </p>
          <div class="flex gap-2 pt-2">
            <a
              v-if="settings?.facebookUrl"
              :href="settings.facebookUrl"
              class="focus-ring grid size-9 place-items-center rounded-md bg-white/10 hover:bg-white/20"
              aria-label="Facebook"
            >
              <Facebook class="size-4" aria-hidden="true" />
            </a>
            <a
              v-if="settings?.instagramUrl"
              :href="settings.instagramUrl"
              class="focus-ring grid size-9 place-items-center rounded-md bg-white/10 hover:bg-white/20"
              aria-label="Instagram"
            >
              <Instagram class="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="border-t border-white/10 py-4">
      <div class="page-shell text-xs text-slate-400">{{ settings?.footerText || '© 2026 March Out For Love.' }}</div>
    </div>
  </footer>
</template>
