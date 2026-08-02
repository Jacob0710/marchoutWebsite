import {
  createStagingServiceClient,
  createStagingAppSession,
  fixturePrefix,
  responseJson,
  runId,
  writePrivateEvidence
} from './lib/runtime.mjs'

const session = await createStagingAppSession()
const listResponse = await session.request(`/api/admin/activities?q=${encodeURIComponent(fixturePrefix)}`)
const list = await responseJson(listResponse, 200, 'Fixture cleanup query')
const fixtures = list.activities.filter(activity => activity.title.startsWith(`${fixturePrefix}-`))
const service = createStagingServiceClient()
const requiredBuckets = ['activity-assets', 'content-assets', 'downloads']
const fixtureIds = fixtures.map(fixture => fixture.id)
const storageRows = fixtureIds.length
  ? await service.from('activity_assets').select('activity_id,storage_bucket,storage_path').in('activity_id', fixtureIds)
  : { data: [], error: null }
if (storageRows.error) throw new Error('Cleanup could not inventory namespaced Storage objects.')
const deletedFixtureIds = []
let deletedStorageObjects = 0

for (const fixture of fixtures) {
  if (!fixture.title.startsWith(`${fixturePrefix}-`)) {
    throw new Error(`Cleanup refused a non-namespaced target: ${fixture.id}`)
  }
  const response = await session.request(`/api/admin/activities/${fixture.id}`, { method: 'DELETE' })
  const result = await responseJson(response, 200, `Fixture cleanup ${fixture.id}`)
  if (!result.cleanupComplete) throw new Error(`Storage cleanup did not complete for ${fixture.id}`)
  deletedFixtureIds.push(fixture.id)
  deletedStorageObjects += Number(fixture.assetCount || 0)
}

const residualResponse = await session.request(`/api/admin/activities?q=${encodeURIComponent(fixturePrefix)}`)
const residualBody = await responseJson(residualResponse, 200, 'Fixture residual query')
const residual = residualBody.activities.filter(activity => activity.title.startsWith(`${fixturePrefix}-`))
if (residual.length) throw new Error(`Fixture cleanup left ${residual.length} residual rows.`)
const residualAssets = fixtureIds.length
  ? await service.from('activity_assets').select('id').in('activity_id', fixtureIds)
  : { data: [], error: null }
if (residualAssets.error || residualAssets.data?.length) throw new Error('Fixture cleanup left residual asset rows.')
const residualStoragePaths = []
for (const row of storageRows.data || []) {
  const { data, error } = await service.storage.from(row.storage_bucket).download(row.storage_path)
  if (!error && data) residualStoragePaths.push(`${row.storage_bucket}/${row.storage_path}`)
}
if (residualStoragePaths.length) throw new Error(`Fixture cleanup left ${residualStoragePaths.length} Storage objects.`)

const listBucketObjects = async (bucket, directory = '', inventory = []) => {
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await service.storage.from(bucket).list(directory, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    })
    if (error) throw new Error(`Cleanup could not inventory the ${bucket} bucket.`)
    for (const entry of data || []) {
      const objectPath = directory ? `${directory}/${entry.name}` : entry.name
      if (entry.id) inventory.push(objectPath)
      else await listBucketObjects(bucket, objectPath, inventory)
      if (inventory.length > 10_000) throw new Error(`Cleanup refused an oversized ${bucket} inventory.`)
    }
    if ((data || []).length < 100) break
  }
  return inventory
}

const storageResidualByBucket = {}
for (const bucket of requiredBuckets) {
  const objects = await listBucketObjects(bucket)
  storageResidualByBucket[bucket] = objects.filter(objectPath => objectPath.includes(fixturePrefix)).length
}
const remainingNamespacedStorageObjectCount = Object.values(storageResidualByBucket)
  .reduce((total, count) => total + count, 0)
if (remainingNamespacedStorageObjectCount) {
  throw new Error(`Fixture cleanup left ${remainingNamespacedStorageObjectCount} namespaced objects across required buckets.`)
}

const evidence = {
  status: 'clean',
  runId,
  prefix: fixturePrefix,
  remoteMutationTarget: 'staging',
  deletedFixtureIds,
  deletedStorageObjects: storageRows.data?.length || deletedStorageObjects,
  remainingFixtureCount: 0,
  remainingAssetRowCount: 0,
  remainingStorageObjectCount: 0,
  storageResidualByBucket,
  cleanedAt: new Date().toISOString()
}
await writePrivateEvidence('cleanup-result.json', evidence)
console.log(JSON.stringify({
  status: evidence.status,
  runId,
  prefix: fixturePrefix,
  remoteMutationTarget: 'staging',
  deletedFixtureCount: deletedFixtureIds.length,
  deletedStorageObjectCount: evidence.deletedStorageObjects,
  remainingFixtureCount: 0,
  remainingAssetRowCount: 0,
  remainingStorageObjectCount: 0,
  storageResidualByBucket
}, null, 2))
