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
const existingResponse = await session.request(`/api/admin/activities?q=${encodeURIComponent(title)}`)
const existing = await responseJson(existingResponse, 200, 'Fixture pre-seed query')
if (existing.activities.some(activity => activity.title === title)) {
  throw new Error(`Seed refused to overwrite an existing fixture: ${title}`)
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
  createdFixtureIds: [created.activity.id],
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
  createdFixtureCount: evidence.createdFixtureIds.length,
  createdAssetCount: evidence.createdAssetIds.length,
  createdStorageObjectCount: evidence.createdStoragePaths.length,
  seededAssetId: uploaded.asset.id
}, null, 2))
