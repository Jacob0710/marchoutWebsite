import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './utils/**/*.{js,ts}',
    './composables/**/*.{js,ts}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#23303f',
        muted: '#697381',
        paper: '#fffaf3',
        cloud: '#f5f7fb',
        coral: '#ef6f61',
        coralDark: '#c84c40',
        honey: '#f4b14a',
        teal: '#1e8a83',
        sage: '#8fbf9f'
      },
      boxShadow: {
        soft: '0 18px 45px rgba(35, 48, 63, 0.12)'
      }
    }
  }
}
