import { expect, test } from '@playwright/test'
import { expectNoBrowserProblems, observeBrowserProblems } from './helpers/assertions'

test('files page does not expose direct private Storage URLs', async ({ page }) => {
  const problems = observeBrowserProblems(page)
  const response = await page.goto('/files')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: '檔案下載', level: 1 })).toBeVisible()
  const html = await page.locator('html').innerHTML()
  expect(html).not.toMatch(/supabase\.co\/storage\/v1\/object\/(?:sign|public)/i)
  expect(html).not.toMatch(/[?&](?:token|signature)=/i)
  await expectNoBrowserProblems(problems)
})
