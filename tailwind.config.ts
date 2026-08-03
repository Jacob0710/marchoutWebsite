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
        muted: '#626d7a',
        paper: '#fffaf3',
        cloud: '#f5f7fb',
        coral: '#b84237',
        coralDark: '#93352d',
        honey: '#f4b14a',
        teal: '#126f6a',
        sage: '#8fbf9f'
      },
      boxShadow: {
        soft: '0 18px 45px rgba(35, 48, 63, 0.12)'
      }
    }
  }
}
