import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './fixtures/auth'
import { isStaging } from './fixtures/test-data'
import { expectNoSensitiveText, expectSecurityHeaders } from './helpers/assertions'
import { requestWithOrigin } from './helpers/request'

test.use({ trace: 'off', video: 'off' })

test.describe('browser security contract', () => {
  test('keeps headers, true 404, request IDs, and safe errors', async ({ request }) => {
    const home = await request.get('/')
    expectSecurityHeaders(home)
    expect(home.headers()['x-request-id']).toMatch(/^[a-zA-Z0-9-]{8,}$/)

    const missing = await request.get('/phase12-security-missing-route')
    expect(missing.status()).toBe(404)
    expect(missing.headers()['cache-control']).toContain('no-store')
    await expectNoSensitiveText(missing)
  })
})

test.describe('authenticated browser security contract', () => {
  test('enforces secure HttpOnly session, no-store admin HTML, and same-origin mutation', async ({ page }) => {
    test.skip(!isStaging, 'Session and same-origin checks require isolated staging auth.')
    const loginResponse = await loginAsAdmin(page)

    const cookies = (await page.context().cookies()).filter(cookie => cookie.name.startsWith('sb-'))
    expect(cookies.length).toBeGreaterThan(0)
    const sessionCookieHeaders = (await loginResponse.headersArray())
      .filter(header => header.name.toLowerCase() === 'set-cookie' && header.value.startsWith('sb-'))
      .map(header => header.value)
    expect(sessionCookieHeaders.length).toBeGreaterThan(0)
    for (const value of sessionCookieHeaders) {
      expect(value).toMatch(/;\s*HttpOnly(?:;|$)/i)
      expect(value).toMatch(/;\s*Secure(?:;|$)/i)
      expect(value).toMatch(/;\s*SameSite=Lax(?:;|$)/i)
    }
    for (const cookie of cookies) {
      expect(cookie.httpOnly).toBe(true)
      expect(cookie.secure).toBe(true)
    }
    const visibleCookieNames = await page.evaluate(() => document.cookie)
    for (const cookie of cookies) expect(visibleCookieNames).not.toContain(`${cookie.name}=`)

    const adminPage = await page.context().request.get('/admin/activities')
    expect(adminPage.status()).toBe(200)
    expect(adminPage.headers()['cache-control']).toContain('no-store')

    const rejected = await requestWithOrigin(
      page.context(),
      '/api/admin/settings',
      'PATCH',
      'https://phase12-cross-origin.invalid',
      { organizationName: 'must-not-change' }
    )
    expect(rejected.status()).toBe(403)
    const error = await rejected.json()
    expect(error.data?.code || error.code).toBe('ADMIN_REQUIRED')
  })
})
