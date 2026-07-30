import { defineConfig, devices } from '@playwright/test'
import { isIP } from 'node:net'

const localBaseUrl = 'http://127.0.0.1:4173'
const stagingBaseUrl = process.env.PHASE12_STAGING_BASE_URL?.trim()
const explicitBaseUrl = process.env.PHASE12_BASE_URL?.trim()
const baseURL = stagingBaseUrl || explicitBaseUrl || localBaseUrl
const remote = Boolean(stagingBaseUrl || explicitBaseUrl)
const stagingHostIp = process.env.PHASE12_STAGING_HOST_IP?.trim() || ''
const chromiumLaunchOptions = stagingBaseUrl && isIP(stagingHostIp)
  ? {
      args: [
        `--host-resolver-rules=MAP ${new URL(stagingBaseUrl).hostname} ${stagingHostIp}`
      ]
    }
  : undefined
const smokeFiles = [
  '**/public-navigation.spec.ts',
  '**/public-activities.spec.ts',
  '**/public-files.spec.ts',
  '**/admin-login.spec.ts',
  '**/security-browser-contract.spec.ts',
  '**/accessibility-smoke.spec.ts'
]

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/artifacts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: stagingBaseUrl ? 60_000 : 40_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei'
  },
  webServer: remote
    ? undefined
    : {
        command: 'pnpm run build && node .output/server/index.mjs',
        url: `${localBaseUrl}/api/health`,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          NITRO_HOST: '127.0.0.1',
          NITRO_PORT: '4173',
          NUXT_PHASE10_ENVIRONMENT: 'local',
          NUXT_PUBLIC_SITE_URL: localBaseUrl,
          NUXT_PUBLIC_SUPABASE_URL: '',
          NUXT_PUBLIC_SUPABASE_ANON_KEY: ''
        }
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions }
    },
    {
      name: 'firefox',
      testMatch: smokeFiles,
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      testMatch: smokeFiles,
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chromium',
      testMatch: smokeFiles,
      use: { ...devices['Pixel 7'], launchOptions: chromiumLaunchOptions }
    }
  ]
})
