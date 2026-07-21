import { writeJson } from './lib/core.mjs'
import { createAdminClient } from './lib/runtime.mjs'

const client = await createAdminClient()
const buckets = ['activity-assets', 'content-assets', 'downloads', 'activity-images', 'public-files']
const referenced = Object.fromEntries(buckets.map((bucket) => [bucket, new Set()]))
const select = async (table, columns) => {
  const { data, error } = await client.from(table).select(columns)
  if (error) throw new Error(`Cannot scan ${table}: ${error.message}`)
  return data
}
for (const row of await select('activity_assets', 'storage_bucket,storage_path')) if (row.storage_path) referenced[row.storage_bucket]?.add(row.storage_path)
for (const row of await select('files', 'storage_path')) if (row.storage_path) referenced.downloads.add(row.storage_path)
for (const row of await select('posts', 'cover_storage_path')) if (row.cover_storage_path) referenced['content-assets'].add(row.cover_storage_path)
for (const row of await select('year_summaries', 'cover_storage_path')) if (row.cover_storage_path) referenced['content-assets'].add(row.cover_storage_path)
for (const row of await select('site_settings', 'logo_storage_path')) if (row.logo_storage_path) referenced['content-assets'].add(row.logo_storage_path)

const listBucket = async (bucket) => {
  const objects = []
  const pending = ['']
  while (pending.length) {
    const prefix = pending.shift()
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
    if (error) throw new Error(`Cannot list ${bucket}: ${error.message}`)
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id) objects.push({ path, size: Number(item.metadata?.size || 0) })
      else pending.push(path)
    }
  }
  return objects
}
try {
  const result = { status: 'pass', scannedAt: new Date().toISOString(), buckets: {}, totals: { objects: 0, bytes: 0, references: 0, orphans: 0, missingObjects: 0 } }
  for (const bucket of buckets) {
    const objects = await listBucket(bucket)
    const objectPaths = new Set(objects.map((item) => item.path))
    const refs = [...referenced[bucket]]
    const orphans = objects.filter((item) => !referenced[bucket].has(item.path)).map((item) => item.path)
    const missingObjects = refs.filter((path) => !objectPaths.has(path))
    result.buckets[bucket] = { objects: objects.length, bytes: objects.reduce((sum, item) => sum + item.size, 0), references: refs.length, orphans, missingObjects }
    result.totals.objects += objects.length
    result.totals.bytes += result.buckets[bucket].bytes
    result.totals.references += refs.length
    result.totals.orphans += orphans.length
    result.totals.missingObjects += missingObjects.length
  }
  if (result.totals.orphans || result.totals.missingObjects) result.status = 'failed'
  await writeJson('outputs/phase9-cleanup-scan.json', result)
  console.log(JSON.stringify(result, null, 2))
  if (result.status !== 'pass') process.exitCode = 1
} finally {
  await client.auth.signOut({ scope: 'local' })
}
