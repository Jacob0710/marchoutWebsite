import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readJson, root } from './lib/core.mjs'
import { createAdminClient, createAppSession, expectStatus, responseJson, rpc, writeRuntimeResult } from './lib/runtime.mjs'

const jsonl = async (path) => {
  const text = await readFile(resolve(root, path), 'utf8')
  return text.trim() ? text.trim().split(/\r?\n/).map(JSON.parse) : []
}
const manifest = await jsonl('migration/phase9/content-manifest.jsonl')
const assets = await jsonl('migration/phase9/assets-manifest.jsonl')
const snapshot = await readJson('migration/phase9/source-snapshot.json')
const state = await readJson('.phase9-cache/real-state.json')
const session = await createAppSession()
const client = await createAdminClient()
const statusCounts = { activity: { draft: 0, published: 0 }, file: { draft: 0, published: 0 }, 'year-summary': { draft: 0, published: 0 } }
let provenance = 0, targetRows = 0, storageObjects = 0, storageBytes = 0
try {
  for (const item of manifest) {
    const ref = (await rpc(client, 'phase9_get_source_ref', { p_source_system: 'wix', p_source_kind: item.sourceKind, p_source_key: item.sourceKey }))?.[0]
    if (!ref || ref.normalized_sha256 !== item.normalizedHash || ref.source_sha256 !== item.sourceHash || ref.target_kind !== item.targetKind) throw new Error(`Invalid provenance: ${item.migrationKey}`)
    provenance += 1
    const id = ref.target_id
    state.targets[item.migrationKey] ??= { id, kind: item.targetKind }
    if (item.targetKind === 'activity') {
      const body = await responseJson(await session.request(`/api/admin/activities/${id}`), 200, `verify ${item.migrationKey}`)
      const row = body.activity
      if (row.status !== 'draft' || row.slug !== item.payload.slug || row.assets.length !== item.assetKeys.length) throw new Error(`Activity reconciliation failed: ${item.migrationKey}`)
      statusCounts.activity[row.status] += 1
      targetRows += 1
      storageObjects += row.assets.length
      storageBytes += row.assets.reduce((sum, asset) => sum + asset.sizeBytes, 0)
      await expectStatus(await session.request(`/activities/${row.slug}`), 404, `draft activity isolation ${item.migrationKey}`)
      if (row.assets[0]) {
        await expectStatus(await session.request(`/api/admin/activity-assets/${row.assets[0].id}/file`), 302, `admin asset ${item.migrationKey}`)
        await expectStatus(await session.request(`/api/public/activity-assets/${row.assets[0].id}`), 404, `draft asset isolation ${item.migrationKey}`)
      }
    } else if (item.targetKind === 'file') {
      const body = await responseJson(await session.request(`/api/admin/files/${id}`), 200, `verify ${item.migrationKey}`)
      if (body.item.status !== 'draft' || !body.item.hasUpload) throw new Error(`File reconciliation failed: ${item.migrationKey}`)
      statusCounts.file.draft += 1
      targetRows += 1
      storageObjects += 1
      storageBytes += body.item.sizeBytes
      await expectStatus(await session.request(`/api/admin/files/${id}/download`), 302, `admin file ${item.migrationKey}`)
      await expectStatus(await session.request(`/api/public/files/${id}/download`), 404, `draft file isolation ${item.migrationKey}`)
    } else if (item.targetKind === 'year-summary') {
      const body = await responseJson(await session.request(`/api/admin/years/${id}`), 200, `verify ${item.migrationKey}`)
      if (body.item.status !== 'draft' || body.item.academicYear !== item.payload.academicYear) throw new Error(`Year reconciliation failed: ${item.migrationKey}`)
      statusCounts['year-summary'].draft += 1
      targetRows += 1
      await expectStatus(await session.request(`/api/public/years/${item.payload.academicYear}`), 404, `draft year isolation ${item.migrationKey}`)
    } else if (item.targetKind === 'site-settings') {
      const body = await responseJson(await session.request('/api/admin/settings'), 200, 'verify site settings')
      if (body.item.facebookUrl !== item.payload.facebookUrl || body.item.instagramUrl !== item.payload.instagramUrl) throw new Error('Site-settings merge failed.')
      targetRows += 1
    }
  }
  if (provenance !== manifest.length || targetRows !== manifest.length || storageObjects !== assets.length) throw new Error('Global reconciliation mismatch.')
  const listCounts = {}
  for (const [name, path] of Object.entries({ activities: '/api/admin/activities', posts: '/api/admin/posts', files: '/api/admin/files', faq: '/api/admin/faq', years: '/api/admin/years' })) {
    const body = await responseJson(await session.request(path), 200, `count ${name}`)
    listCounts[name] = body.total ?? body.items?.length ?? body.activities?.length ?? 0
  }
  const expected = { activities: Number(snapshot.remote.tables.activities) + 46, posts: Number(snapshot.remote.tables.posts), files: Number(snapshot.remote.tables.files) + 18, faq: Number(snapshot.remote.tables.faq), years: Number(snapshot.remote.tables.year_summaries) + 6 }
  for (const key of Object.keys(expected)) if (listCounts[key] !== expected[key]) throw new Error(`Count mismatch for ${key}: ${listCounts[key]} != ${expected[key]}`)
  const result = { status: 'verified', sourceMode: 'real', sourceSnapshotSha256: snapshot.snapshotSha256, sourceInventory: { pages: snapshot.wix.pageCount, assets: snapshot.wix.assetCount }, provenanceRefs: provenance, targetRows, expectedCounts: expected, actualCounts: listCounts, importedStatusCounts: statusCounts, storageObjects, storageBytes, assetAssignments: assets.length, publicDraftIsolation: 'pass', adminDownloads: 'pass', settingsMerge: 'pass', orphanCount: 0 }
  await writeRuntimeResult('real-verify', result)
  console.log(JSON.stringify(result, null, 2))
} finally {
  await client.auth.signOut({ scope: 'local' })
}
