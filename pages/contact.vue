<script setup lang="ts">
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-vue-next'

const { data: settingsData, error: settingsError } = await usePublicSettings()
const settings = computed(() => settingsData.value?.item)

useSeo({
  title: '聯絡我們',
  description: '聯絡愛潮關懷社，洽詢合作、志工加入與活動資訊。'
})
</script>

<template>
  <CommonPageHero
    eyebrow="Contact"
    title="聯絡我們"
    description="歡迎學校、社區、社福夥伴與志工與我們聯繫。"
    image-url="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1800&q=80"
  />

  <section class="section-y">
    <div class="page-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="rounded-lg bg-white p-6 shadow-sm">
        <CommonSectionTitle eyebrow="Reach Us" title="一起把關懷送到現場" :description="settings?.contactText || '網站聯絡設定暫時無法載入。'" />
        <p v-if="settingsError" class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">請稍後重新整理聯絡資訊。</p>
        <div class="mt-8 grid gap-4 text-sm">
          <a v-if="settings?.email" :href="`mailto:${settings.email}`" class="flex items-center gap-3 font-semibold text-ink">
            <Mail class="size-5 text-coral" aria-hidden="true" />
            {{ settings.email }}
          </a>
          <p v-if="settings?.phone" class="flex items-center gap-3 font-semibold text-ink">
            <Phone class="size-5 text-coral" aria-hidden="true" />
            {{ settings.phone }}
          </p>
          <div class="flex gap-2 pt-2">
            <a v-if="settings?.facebookUrl"
              :href="settings.facebookUrl"
              class="focus-ring inline-flex items-center gap-2 rounded-md bg-cloud px-4 py-2 font-bold text-ink"
            >
              <Facebook class="size-4" aria-hidden="true" />
              Facebook
            </a>
            <a v-if="settings?.instagramUrl"
              :href="settings.instagramUrl"
              class="focus-ring inline-flex items-center gap-2 rounded-md bg-cloud px-4 py-2 font-bold text-ink"
            >
              <Instagram class="size-4" aria-hidden="true" />
              Instagram
            </a>
          </div>
        </div>
      </div>

      <div class="grid gap-5">
        <div
          v-for="location in settings?.locations || []"
          :key="location.title"
          class="overflow-hidden rounded-lg bg-white shadow-sm"
        >
          <div class="grid aspect-video place-items-center bg-[linear-gradient(135deg,#dbeafe,#ccfbf1,#fff7ed)] p-6 text-center">
            <MapPin class="mx-auto size-10 text-coral" aria-hidden="true" />
            <h2 class="mt-3 text-xl font-bold text-ink">{{ location.title }}</h2>
            <p class="mt-2 text-sm text-muted">{{ location.address }}</p>
          </div>
          <div class="p-4">
            <a
              :href="location.mapUrl"
              class="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-teal"
            >
              <MapPin class="size-4" aria-hidden="true" />
              開啟地圖
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
