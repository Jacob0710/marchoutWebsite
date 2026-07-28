export default defineNuxtConfig({
  compatibilityDate: '2025-01-15',
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    phase10Environment: 'local',
    phase10HstsEnabled: 'false',
    phase10VerificationOrigins: '',
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      siteUrl: ''
    }
  },
  routeRules: {
    '/admin/**': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/auth/**': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/api/admin/**': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/api/auth/**': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/api/public/activity-assets/**': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/api/public/files/**/download': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/api/public/assets/posts/**/cover': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/api/public/assets/years/**/cover': { headers: { 'cache-control': 'private, no-store, max-age=0' } },
    '/api/health/**': { headers: { 'cache-control': 'no-store, max-age=0' } }
  },
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  typescript: {
    strict: true,
    typeCheck: false
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-Hant'
      },
      title: 'March Out For Love | 愛潮關懷社',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: '愛潮關懷社以陪伴、服務與探索行動，連結青年與社區，讓關懷成為可持續的日常。'
        }
      ]
    }
  }
})
