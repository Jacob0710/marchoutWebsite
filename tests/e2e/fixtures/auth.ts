import { expect, type Page } from '@playwright/test'
import { requireCredentials } from './test-data'

export const loginWith = async (page: Page, kind: 'admin' | 'non-admin') => {
  const credentials = requireCredentials(kind)
  await page.goto('/admin/login')
  const submit = page.getByRole('button', { name: '登入', exact: true })
  await expect(submit).toBeEnabled({ timeout: 30_000 })
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('密碼').fill(credentials.password)
  const loginResponse = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/admin/login',
  { timeout: 30_000 })
  await submit.click()
  await loginResponse
  return credentials
}

export const loginAsAdmin = async (page: Page) => {
  await loginWith(page, 'admin')
  await expect(page).toHaveURL(/\/admin(?:\/)?$/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: '管理後台', exact: true })).toBeVisible({ timeout: 30_000 })
}
