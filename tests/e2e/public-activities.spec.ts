import { expect, test } from '@playwright/test'
import { expectNoBrowserProblems, expectZhHantPage, observeBrowserProblems } from './helpers/assertions'

test.describe('public activities', () => {
  test('opens a published activity from the activity cards', async ({ page }) => {
    const problems = observeBrowserProblems(page)
    await page.goto('/activities')
    const card = page.locator('a[href^="/activities/"]').first()
    await expect(card).toBeVisible()
    const href = await card.getAttribute('href')
    expect(href).toMatch(/^\/activities\/[a-z0-9-]+$/)
    await card.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expectZhHantPage(page)
    await expect(page.locator('a[href*="supabase.co/storage/v1/object/sign"]')).toHaveCount(0)
    await expectNoBrowserProblems(problems)
  })

  test('does not expose an unknown or draft-looking slug', async ({ request }) => {
    const response = await request.get('/activities/e2e-phase12-not-public')
    expect(response.status()).toBe(404)
    expect(await response.text()).not.toContain('storage_path')
  })
})
