import { expect, test } from '@playwright/test'
import { isStaging } from './fixtures/test-data'
import { expectNoBrowserProblems, observeBrowserProblems } from './helpers/assertions'

test.describe('administrator login page', () => {
  test('provides labeled and autocomplete-safe fields', async ({ page }) => {
    const problems = observeBrowserProblems(page)
    await page.goto('/admin/login')
    const email = page.getByLabel('Email')
    const password = page.getByLabel('密碼')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('autocomplete', 'username')
    await expect(password).toHaveAttribute('type', 'password')
    await expect(password).toHaveAttribute('autocomplete', 'current-password')
    await expect(page.getByRole('button', { name: '登入', exact: true })).toBeVisible()
    const expectedUnauthenticatedProbe = isStaging
      ? /\/api\/admin\/session.*401|Failed to load resource.*401/i
      : /\/api\/admin\/session.*503|Failed to load resource.*503/i
    const unexpectedProblems = problems.filter(problem => !expectedUnauthenticatedProbe.test(problem))
    await expectNoBrowserProblems(unexpectedProblems)
  })

  test('allows keyboard submission and does not disclose account existence', async ({ page }) => {
    test.skip(!isStaging, 'Credential error semantics require the isolated staging auth service.')
    await page.goto('/admin/login')
    await expect(page.getByRole('button', { name: '登入', exact: true })).toBeEnabled({ timeout: 30_000 })
    await page.getByLabel('Email').focus()
    await page.keyboard.type('phase12-invalid@example.invalid')
    await page.keyboard.press('Tab')
    await page.keyboard.type('phase12-invalid-password')
    const loginResponse = page.waitForResponse(response =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/admin/login',
    { timeout: 30_000 })
    await page.keyboard.press('Enter')
    await loginResponse
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('登入失敗，請確認帳號或密碼', { timeout: 30_000 })
    await expect(alert).not.toContainText('phase12-invalid@example.invalid')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
