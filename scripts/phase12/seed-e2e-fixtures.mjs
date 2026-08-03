import {
  createStagingServiceClient,
  createStagingAppSession,
  fixturePrefix,
  responseJson,
  runId,
  writePrivateEvidence
} from './lib/runtime.mjs'

const session = await createStagingAppSession()
const title = `${fixturePrefix}-seed-readonly`
const slug = title.toLowerCase()
const publishedTitle = `${fixturePrefix}-published`
const publishedSlug = publishedTitle.toLowerCase()
const existingResponse = await session.request(`/api/admin/activities?q=${encodeURIComponent(fixturePrefix)}`)
const existing = await responseJson(existingResponse, 200, 'Fixture pre-seed query')
if (existing.activities.some(activity => [title, publishedTitle].includes(activity.title))) {
  throw new Error(`Seed refused to overwrite an existing fixture namespace: ${fixturePrefix}`)
}

const createdResponse = await session.json('/api/admin/activities', 'POST', {
  title,
  slug,
  academicYear: 115,
  activityType: 'regular',
  eventDate: '2026-07-30',
  location: 'Phase 12 isolated staging',
  participantsCount: 12,
  resultSummary: 'Deterministic Phase 12 read-only browser fixture.',
  content: 'This draft is isolated to the named Phase 12 staging run.',
  tags: ['phase12', 'e2e', runId]
})
const created = await responseJson(createdResponse, 200, 'Fixture seed')
const publishedResponse = await session.json('/api/admin/activities', 'POST', {
  title: publishedTitle,
  slug: publishedSlug,
  academicYear: 115,
  activityType: 'regular',
  eventDate: '2026-07-30',
  location: 'Phase 12 isolated staging',
  participantsCount: 12,
  resultSummary: 'Deterministic Phase 12 public browser fixture.',
  content: 'This published fixture exists only for the named Phase 12 staging run.',
  tags: ['phase12', 'e2e', 'published', runId]
})
const published = await responseJson(publishedResponse, 200, 'Published fixture seed')
const publishResponse = await session.json(`/api/admin/activities/${published.activity.id}/publish`, 'POST', {})
await responseJson(publishResponse, 200, 'Published fixture activation')
const png = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z6p8AAAAASUVORK5CYII=',
  'base64'
))
const form = new FormData()
form.append('file', new Blob([png], { type: 'image/png' }), `${fixturePrefix}.png`)
form.append('kind', 'image')
form.append('altText', 'Phase 12 deterministic private fixture')
form.append('sortOrder', '0')
const uploadResponse = await session.request(`/api/admin/activities/${created.activity.id}/assets`, {
  method: 'POST',
  body: form
})
const uploaded = await responseJson(uploadResponse, 200, 'Fixture asset seed')
const service = createStagingServiceClient()
const { data: storageRows, error: storageError } = await service
  .from('activity_assets')
  .select('id,storage_bucket,storage_path')
  .eq('activity_id', created.activity.id)
if (storageError || !storageRows?.length) throw new Error('Seed could not verify its private Storage metadata.')
const evidence = {
  runId,
  prefix: fixturePrefix,
  remoteMutationTarget: 'staging',
  createdFixtureIds: [created.activity.id, published.activity.id],
  createdAssetIds: [uploaded.asset.id],
  createdStoragePaths: storageRows.map(row => `${row.storage_bucket}/${row.storage_path}`),
  createdAt: new Date().toISOString()
}
await writePrivateEvidence('fixtures.json', evidence)
console.log(JSON.stringify({
  status: 'seeded',
  runId,
  prefix: fixturePrefix,
  remoteMutationTarget: 'staging',
  createdFixtureCount: 2,
  createdAssetCount: evidence.createdAssetIds.length,
  createdStorageObjectCount: evidence.createdStoragePaths.length,
  seededAssetId: uploaded.asset.id
}, null, 2))
