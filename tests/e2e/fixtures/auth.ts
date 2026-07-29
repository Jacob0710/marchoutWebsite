import { expect, type Page } from '@playwright/test'
import { requireCredentials } from './test-data'

export const loginWith = async (page: Page, kind: 'admin' | 'non-admin') => {
  const credentials = requireCredentials(kind)
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('密碼').fill(credentials.password)
  await page.getByRole('button', { name: '登入', exact: true }).click()
  return credentials
}

export const loginAsAdmin = async (page: Page) => {
  await loginWith(page, 'admin')
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
  await expect(page.getByRole('heading', { name: '管理後台' })).toBeVisible()
}
