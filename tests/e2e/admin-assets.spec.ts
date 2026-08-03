import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './fixtures/auth'
import { isStaging, seededAssetId } from './fixtures/test-data'

test.use({ trace: 'off', video: 'off' })

test.describe('administrator private asset boundary', () => {
  test('keeps the deterministic draft asset private while allowing the admin proxy', async ({ page }) => {
    test.skip(!isStaging, 'Private staging asset verification requires staging data.')
    test.skip(test.info().project.name !== 'chromium', 'The authenticated asset smoke runs once on Chromium.')
    await loginAsAdmin(page)

    expect(seededAssetId).toMatch(/^[0-9a-f-]{36}$/i)

    const publicAsset = await page.context().request.get(`/api/public/activity-assets/${seededAssetId}`)
    expect(publicAsset.status()).toBe(404)
    expect(publicAsset.headers()['cache-control']).toContain('no-store')
    expect(publicAsset.headers()['location']).toBeUndefined()

    const adminAsset = await page.context().request.get(`/api/admin/activity-assets/${seededAssetId}/file`)
    expect(adminAsset.status()).toBe(200)
    expect(adminAsset.headers()['cache-control']).toContain('no-store')
    expect(adminAsset.headers()['cross-origin-resource-policy']).toBe('same-origin')
    expect((await adminAsset.body()).byteLength).toBeGreaterThan(0)
  })
})
