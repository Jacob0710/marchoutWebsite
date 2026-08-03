import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const route of ['/', '/about', '/activities', '/files', '/years', '/admin/login']) {
  test(`accessibility blocker smoke: ${route}`, async ({ page }) => {
    await page.goto(route)
    const frameTitles = await page.locator('iframe').evaluateAll(frames =>
      frames.map(frame => frame.getAttribute('title')?.trim() || ''),
    )
    expect(frameTitles.every(Boolean), 'Every third-party frame must have a non-empty accessible title').toBe(true)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // The frame title is our accessibility boundary; embedded third-party DOM
      // is outside this application's control and can vary by browser/session.
      .exclude('iframe')
      .analyze()
    const blockers = results.violations.filter(item => item.impact === 'critical' || item.impact === 'serious')
    expect(blockers, JSON.stringify(blockers, null, 2)).toEqual([])
  })
}

test('keyboard reaches and operates the primary navigation', async ({ page }) => {
  await page.goto('/')
  if ((page.viewportSize()?.width || 1280) < 1024) {
    await page.getByRole('button', { name: '開啟選單' }).click()
  }
  await page.getByRole('link', { name: '關於我們', exact: true }).first().focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/about$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
