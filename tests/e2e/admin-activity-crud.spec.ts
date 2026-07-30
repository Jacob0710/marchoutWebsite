import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './fixtures/auth'
import { fixturePrefix, isStaging } from './fixtures/test-data'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z6p8AAAAASUVORK5CYII=',
  'base64'
)
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

test.use({ trace: 'off', video: 'off' })

test.describe('staging administrator CRUD journey', () => {
  test('creates, enriches, publishes, withdraws, and cleans an isolated activity', async ({ page, baseURL }) => {
    test.skip(!isStaging, 'Mutation E2E is permitted only on the isolated staging environment.')
    test.skip(test.info().project.name !== 'chromium', 'CRUD runs once on staging Chromium.')
    test.info().annotations.push({ type: 'remote-mutation-target', description: 'staging-only' })

    const title = `${fixturePrefix}-crud`
    const slug = `${fixturePrefix}-crud`.toLowerCase()
    let activityId = ''
    await loginAsAdmin(page)

    try {
      await page.goto('/admin/activities/new')
      const saveDraft = page.getByRole('button', { name: '儲存草稿' })
      await expect(saveDraft).toBeEnabled({ timeout: 30_000 })
      await page.getByLabel('活動標題').fill(title)
      await page.getByLabel('Slug').fill(slug)
      await page.getByLabel('學年度').fill('115')
      await page.getByLabel('活動日期').fill('2026-07-30')
      await page.getByLabel('地點').fill('Phase 12 staging fixture location')
      await page.getByLabel('參與人數').fill('12')
      await page.getByLabel('活動成果摘要').fill('Phase 12 isolated staging browser journey result.')
      await page.getByLabel('活動正文').fill('This fixture exists only for the Phase 12 staging CRUD journey.')
      await saveDraft.click()
      await expect(page).toHaveURL(/\/admin\/activities\/[0-9a-f-]+\/edit$/i)
      activityId = page.url().match(/\/admin\/activities\/([0-9a-f-]+)\/edit$/i)?.[1] || ''
      expect(activityId).toMatch(/^[0-9a-f-]{36}$/i)

      await page.getByLabel('檔案').setInputFiles({ name: `${fixturePrefix}.png`, mimeType: 'image/png', buffer: png })
      await page.getByLabel('替代文字').first().fill('Phase 12 staging fixture pixel')
      await page.getByRole('button', { name: '上傳' }).click()
      await expect(page.getByAltText('Phase 12 staging fixture pixel')).toBeVisible()
      await page.getByRole('button', { name: '設為封面' }).click()

      await page.getByLabel('種類').selectOption('attachment')
      await page.getByLabel('檔案').setInputFiles({ name: `${fixturePrefix}.pdf`, mimeType: 'application/pdf', buffer: pdf })
      await page.getByRole('button', { name: '上傳' }).click()
      await expect(page.getByText(`${fixturePrefix}.pdf`, { exact: true })).toBeVisible()

      await page.getByLabel('影片 URL').first().fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      await page.getByLabel('影片名稱').first().fill('Phase 12 staging video')
      await page.getByRole('button', { name: '新增', exact: true }).click()
      await expect(page.getByLabel('影片名稱').last()).toHaveValue('Phase 12 staging video')

      await page.getByLabel('活動成果摘要').fill('Phase 12 edited isolated staging result.')
      const updateResponse = page.waitForResponse(response =>
        response.request().method() === 'PATCH'
        && new URL(response.url()).pathname === `/api/admin/activities/${activityId}`)
      await page.getByRole('button', { name: '儲存草稿' }).click()
      expect((await updateResponse).status()).toBe(200)
      await page.reload()
      await expect(page.getByLabel('活動成果摘要')).toHaveValue('Phase 12 edited isolated staging result.')

      await page.getByRole('button', { name: '發布', exact: true }).click()
      const publishDialog = page.getByRole('dialog', { name: '發布活動' })
      await expect(publishDialog).toBeVisible()
      const publishResponse = page.waitForResponse(response =>
        response.request().method() === 'POST'
        && new URL(response.url()).pathname === `/api/admin/activities/${activityId}/publish`)
      await publishDialog.getByRole('button', { name: '確認發布' }).click()
      expect((await publishResponse).status()).toBe(200)

      const publicPage = await page.context().newPage()
      await publicPage.goto(`/activities/${slug}`)
      await expect(publicPage.getByRole('heading', { name: title, level: 1 })).toBeVisible()
      await expect(publicPage.getByAltText('Phase 12 staging fixture pixel')).toBeVisible()
      await publicPage.close()

      await page.getByRole('button', { name: '撤回', exact: true }).click()
      const withdrawDialog = page.getByRole('dialog', { name: '撤回活動' })
      const withdrawResponse = page.waitForResponse(response =>
        response.request().method() === 'POST'
        && new URL(response.url()).pathname === `/api/admin/activities/${activityId}/unpublish`)
      await withdrawDialog.getByRole('button', { name: '確認撤回' }).click()
      expect((await withdrawResponse).status()).toBe(200)
      expect((await page.context().request.get(`/activities/${slug}`)).status()).toBe(404)

      await page.getByTestId('delete-activity').click()
      const deleteDialog = page.getByRole('dialog', { name: '刪除活動' })
      const deleteResponse = page.waitForResponse(response =>
        response.request().method() === 'DELETE'
        && new URL(response.url()).pathname === `/api/admin/activities/${activityId}`)
      await deleteDialog.getByRole('button', { name: '永久刪除' }).click()
      expect((await deleteResponse).status()).toBe(200)
      await expect(page).toHaveURL(/\/admin\/activities$/)
      activityId = ''
    } finally {
      if (activityId) {
        const origin = new URL(baseURL!).origin
        await page.context().request.post(`/api/admin/activities/${activityId}/unpublish`, {
          headers: { origin },
          data: {}
        }).catch(() => undefined)
        const cleanup = await page.context().request.delete(`/api/admin/activities/${activityId}`, {
          headers: { origin }
        })
        expect([200, 404]).toContain(cleanup.status())
      }
    }
  })
})
