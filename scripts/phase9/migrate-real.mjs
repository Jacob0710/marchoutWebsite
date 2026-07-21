import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { appCommit, cacheDir, readJson, root, sha256, writeJson, writeJsonl } from './lib/core.mjs'
import { createAdminClient, createAppSession, expectStatus, finishRun, responseJson, rpc, writeRuntimeResult } from './lib/runtime.mjs'

const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || 'dry-run'
if (!['dry-run', 'apply', 'resume'].includes(mode)) throw new Error(`Unsupported mode: ${mode}`)
const jsonl = async (path) => {
  const text = await readFile(resolve(root, path), 'utf8')
  return text.trim() ? text.trim().split(/\r?\n/).map(JSON.parse) : []
}
const manifest = await jsonl('migration/phase9/content-manifest.jsonl')
const assets = await jsonl('migration/phase9/assets-manifest.jsonl')
const snapshot = await readJson('migration/phase9/source-snapshot.json')
if (snapshot.snapshotSha256 !== '3a6a00bcd5a5b8030ab5da6b61cd597f2df4c0762edb46dd9f8655e003cceb60') throw new Error('Unexpected Wix snapshot hash.')
const blockers = manifest.filter((item) => item.blockingIssues?.length)
if (blockers.length) throw new Error(`${blockers.length} migration-blocking manifest items remain.`)
const assetMap = new Map(assets.map((asset) => [asset.assetKey, asset]))
for (const item of manifest) {
  if (sha256(item.payload) !== item.normalizedHash) throw new Error(`Normalized hash mismatch: ${item.migrationKey}`)
  for (const key of item.assetKeys) if (!assetMap.has(key)) throw new Error(`Missing asset assignment: ${key}`)
}

const countAdmin = async (session) => {
  const output = {}
  for (const [kind, path] of Object.entries({ activities: '/api/admin/activities', posts: '/api/admin/posts', files: '/api/admin/files', faq: '/api/admin/faq', years: '/api/admin/years' })) {
    const body = await responseJson(await session.request(path), 200, `count ${kind}`)
    output[kind] = body.total ?? body.items?.length ?? body.activities?.length ?? 0
  }
  return output
}
const validateAssets = async () => {
  let bytes = 0
  for (const asset of assets) {
    const data = new Uint8Array(await readFile(resolve(root, '.phase9-cache/wix/assets', asset.cacheName)))
    if (data.length !== asset.byteSize || sha256(data) !== asset.sourceSha256) throw new Error(`Cached asset integrity failed: ${asset.assetKey}`)
    bytes += data.length
  }
  return bytes
}

if (mode === 'dry-run') {
  const session = await createAppSession()
  const before = await countAdmin(session)
  const bytes = await validateAssets()
  const after = await countAdmin(session)
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Dry-run changed target counts.')
  const result = { mode, sourceMode: 'real', sourceSnapshotSha256: snapshot.snapshotSha256, manifestItems: manifest.length, assetAssignments: assets.length, validatedBytes: bytes, blockingItems: 0, databaseMutations: 0, storageMutations: 0, before, after, status: 'validated' }
  await writeRuntimeResult('real-dry-run', result)
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

const runKey = `phase9-wix-${snapshot.snapshotSha256.slice(0, 24)}`
const stateFile = resolve(cacheDir, 'real-state.json')
let state
try { state = JSON.parse(await readFile(stateFile, 'utf8')) } catch { state = { runKey, sourceSnapshotSha256: snapshot.snapshotSha256, targets: {}, createdOrder: [] } }
if (state.runKey !== runKey) throw new Error('Real migration state belongs to another snapshot.')
const session = await createAppSession()
const client = await createAdminClient()
const before = await countAdmin(session)
const run = await rpc(client, 'phase9_begin_migration_run', { p_run_key: runKey, p_source_system: 'wix', p_source_snapshot_sha256: snapshot.snapshotSha256, p_app_commit_sha: await appCommit(), p_mode: 'apply' })
state.runId = run.id
const save = () => writeJson('.phase9-cache/real-state.json', state)
const getRef = async (item) => (await rpc(client, 'phase9_get_source_ref', { p_source_system: 'wix', p_source_kind: item.sourceKind, p_source_key: item.sourceKey }))?.[0] || null
const record = (item, id) => rpc(client, 'phase9_record_source_ref', { p_migration_run_id: run.id, p_source_system: 'wix', p_source_kind: item.sourceKind, p_source_key: item.sourceKey, p_source_url: item.sourceUrl || null, p_source_sha256: item.sourceHash, p_normalized_sha256: item.normalizedHash, p_target_kind: item.targetKind, p_target_id: id, p_target_natural_key: item.targetNaturalKey, p_operation: item.operation })
let created = 0, updated = 0, skipped = 0, uploaded = 0, uploadedBytes = 0

const uploadAsset = async (item, target, asset, sortOrder) => {
  if (target.uploadedAssetKeys?.includes(asset.assetKey)) return
  const bytes = new Uint8Array(await readFile(resolve(root, '.phase9-cache/wix/assets', asset.cacheName)))
  let body
  if (item.targetKind === 'activity') {
    body = await responseJson(await session.upload(`/api/admin/activities/${target.id}/assets`, asset.originalFilename, asset.detectedMimeType, bytes, { kind: asset.role === 'attachment' ? 'attachment' : 'image', altText: asset.altText || '', sortOrder }), 200, `upload ${asset.assetKey}`)
    if (asset.role === 'cover') await expectStatus(await session.json(`/api/admin/activities/${target.id}/cover`, 'POST', { assetId: body.asset.id }), 200, `cover ${asset.assetKey}`)
  } else if (item.targetKind === 'file') {
    await expectStatus(await session.upload(`/api/admin/files/${target.id}/upload`, asset.originalFilename, asset.detectedMimeType, bytes), 200, `upload ${asset.assetKey}`)
  } else throw new Error(`Unsupported asset owner: ${item.targetKind}`)
  target.uploadedAssetKeys ??= []
  target.uploadedAssetKeys.push(asset.assetKey)
  uploaded += 1
  uploadedBytes += bytes.length
  await save()
}

const createTarget = async (item) => {
  let target = state.targets[item.migrationKey]
  if (!target) {
    if (item.targetKind === 'activity') {
      const payload = Object.fromEntries(Object.entries(item.payload).filter(([key, value]) => value !== null || !['activityType'].includes(key)))
      const body = await responseJson(await session.json('/api/admin/activities', 'POST', payload), 200, `create ${item.migrationKey}`)
      target = { id: body.activity.id, kind: item.targetKind, uploadedAssetKeys: [] }
    } else if (item.targetKind === 'file') {
      const body = await responseJson(await session.json('/api/admin/files', 'POST', item.payload), 200, `create ${item.migrationKey}`)
      target = { id: body.item.id, kind: item.targetKind, uploadedAssetKeys: [] }
    } else if (item.targetKind === 'year-summary') {
      const body = await responseJson(await session.json('/api/admin/years', 'POST', item.payload), 200, `create ${item.migrationKey}`)
      target = { id: body.item.id, kind: item.targetKind, uploadedAssetKeys: [] }
    } else if (item.targetKind === 'site-settings') {
      const prior = await responseJson(await session.request('/api/admin/settings'), 200, 'read settings backup')
      const body = await responseJson(await session.json('/api/admin/settings', 'PATCH', item.payload), 200, `merge ${item.migrationKey}`)
      target = { id: body.item.id, kind: item.targetKind, uploadedAssetKeys: [], backup: prior.item }
      updated += 1
    } else throw new Error(`Unsupported real target: ${item.targetKind}`)
    state.targets[item.migrationKey] = target
    state.createdOrder.push(item.migrationKey)
    if (item.targetKind !== 'site-settings') created += 1
    await save()
  }
  let sortOrder = 0
  for (const key of item.assetKeys) await uploadAsset(item, target, assetMap.get(key), sortOrder++)
  return target
}

try {
  for (const item of manifest) {
    const ref = await getRef(item)
    if (ref) {
      if (ref.source_sha256 !== item.sourceHash || ref.target_kind !== item.targetKind) throw new Error(`Provenance conflict: ${item.migrationKey}`)
      if (ref.normalized_sha256 !== item.normalizedHash) {
        if (item.targetKind !== 'activity') throw new Error(`Controlled update is unsupported: ${item.migrationKey}`)
        const payload = Object.fromEntries(Object.entries(item.payload).filter(([key, value]) => value !== null || !['activityType'].includes(key)))
        await responseJson(await session.json(`/api/admin/activities/${ref.target_id}`, 'PATCH', payload), 200, `update ${item.migrationKey}`)
        await record(item, ref.target_id)
        state.targets[item.migrationKey] ??= { id: ref.target_id, kind: item.targetKind, uploadedAssetKeys: item.assetKeys }
        updated += 1
        continue
      }
      state.targets[item.migrationKey] ??= { id: ref.target_id, kind: item.targetKind, uploadedAssetKeys: item.assetKeys }
      skipped += 1
      continue
    }
    const target = await createTarget(item)
    await record(item, target.id)
  }
  const after = await countAdmin(session)
  const summary = { mode, sourceMode: 'real', status: 'completed', runKey, sourceSnapshotSha256: snapshot.snapshotSha256, created, updated, skipped, conflicted: 0, failed: 0, uploadedObjects: uploaded, uploadedBytes, before, after }
  await finishRun(client, run.id, 'completed', summary)
  state.lastResult = summary
  await save()
  const rollback = [...state.createdOrder].reverse().map((migrationKey) => { const target = state.targets[migrationKey]; return { runKey, migrationKey, targetKind: target.kind, targetId: target.id, action: target.kind === 'site-settings' ? 'restore-settings-backup' : 'delete-created-target', createdByRun: target.kind !== 'site-settings' } })
  await writeJsonl('migration/phase9/rollback-manifest.jsonl', rollback)
  await writeRuntimeResult(`real-${mode}`, summary)
  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  await finishRun(client, run.id, 'failed', { mode, sourceMode: 'real', created, updated, skipped, uploadedObjects: uploaded, failed: 1, message: String(error.message).slice(0, 300) }).catch(() => {})
  throw error
} finally {
  await client.auth.signOut({ scope: 'local' })
}
