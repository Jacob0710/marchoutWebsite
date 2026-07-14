export default defineNuxtConfig({
  compatibilityDate: '2025-01-15',
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseAnonKey: ''
    }
  },
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
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
