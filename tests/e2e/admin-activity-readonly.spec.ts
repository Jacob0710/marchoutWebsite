import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './fixtures/auth'
import { isStaging } from './fixtures/test-data'

test.use({ trace: 'off', video: 'off' })

test.describe('active administrator read-only journey', () => {
  test('loads protected pages, keeps private cache boundaries, and logs out', async ({ page }) => {
    test.skip(!isStaging, 'Active administrator journey is staging-only.')
    await loginAsAdmin(page)

    await page.goto('/admin/dashboard')
    await expect(page.getByRole('heading', { name: '內容總覽' })).toBeVisible()
    await page.goto('/admin/activities')
    await expect(page.getByRole('heading', { name: '活動管理' })).toBeVisible()
    await expect(page.getByText(/草稿|已發布/).first()).toBeVisible()

    const adminHtml = await page.context().request.get('/admin/activities')
    expect(adminHtml.status()).toBe(200)
    expect(adminHtml.headers()['cache-control']).toContain('no-store')

    await page.getByRole('button', { name: '登出' }).click()
    await expect(page).toHaveURL(/\/admin\/login/)
    await page.goBack()
    await expect(page).toHaveURL(/\/admin\/login/)
    expect((await page.context().request.get('/api/admin/session')).status()).toBe(401)
  })
})
