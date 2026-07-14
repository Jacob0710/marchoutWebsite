<script setup lang="ts">
import { Facebook, Instagram, Mail, MapPin } from 'lucide-vue-next'
import { siteSettings } from '~/utils/mockData'
</script>

<template>
  <footer class="bg-ink text-white">
    <div class="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <p class="text-sm font-semibold text-honey">{{ siteSettings.clubNameZh }}</p>
        <h2 class="mt-2 text-2xl font-bold">{{ siteSettings.clubNameEn }}</h2>
        <p class="mt-4 max-w-xl leading-7 text-slate-300">{{ siteSettings.contactText }}</p>
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
          <a :href="`mailto:${siteSettings.email}`" class="flex items-center gap-2 hover:text-white">
            <Mail class="size-4" aria-hidden="true" />
            {{ siteSettings.email }}
          </a>
          <p class="flex items-start gap-2">
            <MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ siteSettings.locations[0].address }}
          </p>
          <div class="flex gap-2 pt-2">
            <a
              :href="siteSettings.facebookUrl"
              class="focus-ring grid size-9 place-items-center rounded-md bg-white/10 hover:bg-white/20"
              aria-label="Facebook"
            >
              <Facebook class="size-4" aria-hidden="true" />
            </a>
            <a
              :href="siteSettings.instagramUrl"
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
      <div class="page-shell text-xs text-slate-400">© 2026 March Out For Love.</div>
    </div>
  </footer>
</template>
