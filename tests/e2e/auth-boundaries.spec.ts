import { expect, test } from '@playwright/test'
import { isStaging, seededAssetId } from './fixtures/test-data'
import { loginWith } from './fixtures/auth'

test.use({ trace: 'off', video: 'off' })

test.describe('anonymous authorization boundary', () => {
  test('redirects an anonymous administrator navigation to login', async ({ page }) => {
    const response = await page.goto('/admin/activities')
    if (isStaging) {
      await expect(page).toHaveURL(/\/admin\/login\?redirect=/)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      return
    }

    expect(response?.status()).toBe(503)
    await expect(page).toHaveURL(/\/admin\/activities$/)
    await expect(page.locator('body')).toContainText('Service temporarily unavailable')
  })

  test('denies anonymous administrator reads and mutations', async ({ request, baseURL }) => {
    const read = await request.get('/api/admin/activities')
    expect(read.status()).toBe(isStaging ? 401 : 503)
    if (isStaging) {
      expect(seededAssetId).toMatch(/^[0-9a-f-]{36}$/i)
      expect((await request.get(`/api/admin/activity-assets/${seededAssetId}/file`)).status()).toBe(401)
      expect((await request.get(`/api/public/activity-assets/${seededAssetId}`)).status()).toBe(404)
    }

    const mutation = await request.post('/api/admin/activities', {
      headers: { origin: new URL(baseURL!).origin },
      data: { title: 'e2e-phase12-anonymous-must-not-create' }
    })
    expect(mutation.status()).toBe(isStaging ? 401 : 503)
  })
})

test.describe('authenticated non-admin boundary', () => {
  test('rejects a valid non-admin identity and invalidates it on logout', async ({ page }) => {
    test.skip(!isStaging, 'Dedicated non-admin identity is a staging-only contract.')
    await loginWith(page, 'non-admin')
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.getByRole('alert')).toContainText('此帳號沒有管理權限')

    const session = await page.context().request.get('/api/admin/session')
    expect(session.status()).toBe(403)
    expect(seededAssetId).toMatch(/^[0-9a-f-]{36}$/i)
    expect((await page.context().request.get(`/api/admin/activity-assets/${seededAssetId}/file`)).status()).toBe(403)
    const mutation = await page.context().request.post('/api/admin/activities', {
      headers: { origin: new URL(page.url()).origin },
      data: { title: 'e2e-phase12-non-admin-must-not-create' }
    })
    expect(mutation.status()).toBe(403)

    const logout = await page.context().request.post('/api/admin/logout', {
      headers: { origin: new URL(page.url()).origin },
      data: {}
    })
    expect(logout.status()).toBe(200)
    expect((await page.context().request.get('/api/admin/session')).status()).toBe(401)
  })
})
