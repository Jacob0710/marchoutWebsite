import { expect, test } from '@playwright/test'
import { navigationLinks } from './fixtures/selectors'
import {
  expectNoBrowserProblems,
  expectNoSensitiveText,
  expectSecurityHeaders,
  expectZhHantPage,
  observeBrowserProblems
} from './helpers/assertions'

test.describe('public visitor navigation', () => {
  test('loads the home page and semantic primary navigation', async ({ page }) => {
    const problems = observeBrowserProblems(page)
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'March Out For Love', level: 1 })).toBeVisible()
    await expect(page.getByTestId('site-brand-icon')).toBeVisible()
    await expectZhHantPage(page)

    if ((page.viewportSize()?.width || 1280) < 1024) {
      await page.getByRole('button', { name: '開啟選單' }).click()
    }
    for (const link of navigationLinks) {
      const locator = page.getByRole('link', { name: link.name, exact: true }).first()
      await expect(locator).toBeVisible()
      await expect(locator).toHaveAttribute('href', link.path)
    }

    await expect(page.getByText('活動內容管理')).toHaveCount(0)
    await expectNoBrowserProblems(problems)
  })

  for (const route of [
    { path: '/about', heading: '關於愛潮關懷社' },
    { path: '/activities', heading: '活動成果' },
    { path: '/files', heading: '檔案下載' },
    { path: '/years', heading: '年度成果' }
  ]) {
    test(`${route.path} renders without console or hydration failures`, async ({ page }) => {
      const problems = observeBrowserProblems(page)
      const response = await page.goto(route.path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible()
      await expectZhHantPage(page)
      await expectNoBrowserProblems(problems)
    })
  }

  test('exposes robots and sitemap and returns a true safe 404', async ({ request }) => {
    for (const path of ['/robots.txt', '/sitemap.xml']) {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      await expectNoSensitiveText(response)
    }

    const missing = await request.get('/phase12-intentional-missing-route')
    expect(missing.status()).toBe(404)
    expect(missing.headers()['cache-control']).toContain('no-store')
    await expectNoSensitiveText(missing)
  })

  test('keeps public security and cache contracts', async ({ request }) => {
    const response = await request.get('/')
    expect(response.status()).toBe(200)
    expectSecurityHeaders(response)
    expect(response.headers()['cache-control']).toContain('public')
    expect(response.headers()['set-cookie']).toBeUndefined()
  })
})
