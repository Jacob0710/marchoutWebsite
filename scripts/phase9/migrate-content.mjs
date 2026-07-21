import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readJson, root } from './lib/core.mjs'
import { beginSyntheticRun, createAdminClient, createAppSession, expectStatus, finishRun, png, recordRef, responseJson, sourceRef, syntheticItems, syntheticRunKey, syntheticSnapshotHash, textFile, updateRollbackManifest, writeRuntimeResult, writeState } from './lib/runtime.mjs'

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || 'dry-run'
const synthetic = process.argv.includes('--synthetic')
if (!['dry-run', 'apply', 'resume'].includes(modeArg)) throw new Error(`Unsupported migration mode: ${modeArg}`)

const manifestText = await readFile(resolve(root, 'migration/phase9/content-manifest.jsonl'), 'utf8')
const manifest = manifestText.trim() ? manifestText.trim().split(/\r?\n/).map(JSON.parse) : []
const blockers = manifest.filter((item) => item.blockingIssues?.length)

if (modeArg === 'dry-run') {
  const session = await createAppSession()
  const before = {}
  for (const path of ['/api/admin/activities', '/api/admin/posts', '/api/admin/files', '/api/admin/faq', '/api/admin/years']) {
    const response = await expectStatus(await session.request(path), 200, `dry-run access ${path}`)
    const body = await response.json()
    before[path] = body.total ?? body.items?.length ?? body.activities?.length ?? 0
  }
  for (const item of syntheticItems) {
    if (!item.sourceHash.match(/^[0-9a-f]{64}$/) || !item.normalizedHash.match(/^[0-9a-f]{64}$/)) throw new Error(`Invalid synthetic hash: ${item.sourceKey}`)
    if (/<script|javascript:|v-html/i.test(JSON.stringify(item.payload))) throw new Error(`Unsafe synthetic payload: ${item.sourceKey}`)
  }
  const after = {}
  for (const path of Object.keys(before)) {
    const response = await expectStatus(await session.request(path), 200, `dry-run postcheck ${path}`)
    const body = await response.json()
    after[path] = body.total ?? body.items?.length ?? body.activities?.length ?? 0
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Dry-run changed target counts')
  const result = { mode: 'dry-run', sourceMode: synthetic ? 'synthetic' : 'real', databaseMutations: 0, storageMutations: 0, manifestItems: manifest.length, blockingItems: blockers.length, syntheticItemsValidated: syntheticItems.length, before, after, status: synthetic ? 'validated' : blockers.length ? 'blocked-as-designed' : 'validated' }
  await writeRuntimeResult('dry-run', result)
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

if (!synthetic) throw new Error('Use migrate-real.mjs for the authoritative Wix migration; this entry point is the isolated synthetic rollback proof.')

const session = await createAppSession()
const client = await createAdminClient()
const run = await beginSyntheticRun(client)
const runId = run.id
const targets = {}
let created = 0
let skipped = 0
let uploaded = 0

const createTarget = async (item) => {
  if (item.targetKind === 'activity') {
    const body = await responseJson(await session.json('/api/admin/activities', 'POST', item.payload), 200, 'create synthetic activity')
    const id = body.activity.id
    const image = await responseJson(await session.upload(`/api/admin/activities/${id}/assets`, 'phase9-synthetic.png', 'image/png', png, { kind: 'image', altText: 'Synthetic one-pixel test image', sortOrder: 0 }), 200, 'upload synthetic activity image')
    uploaded += 1
    await expectStatus(await session.json(`/api/admin/activities/${id}/cover`, 'POST', { assetId: image.asset.id }), 200, 'assign synthetic activity cover')
    await expectStatus(await session.upload(`/api/admin/activities/${id}/assets`, 'phase9-synthetic.txt', 'text/plain', textFile, { kind: 'attachment', sortOrder: 1 }), 200, 'upload synthetic activity attachment')
    uploaded += 1
    await expectStatus(await session.json(`/api/admin/activities/${id}/videos`, 'POST', { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Synthetic external video', sortOrder: 0 }), 200, 'create synthetic activity video')
    await expectStatus(await session.json(`/api/admin/activities/${id}/publish`, 'POST'), 200, 'publish synthetic activity')
    return id
  }
  if (item.targetKind === 'post') {
    const body = await responseJson(await session.json('/api/admin/posts', 'POST', item.payload), 200, 'create synthetic post')
    await expectStatus(await session.upload(`/api/admin/posts/${body.item.id}/cover`, 'phase9-synthetic.png', 'image/png', png, { altText: 'Synthetic one-pixel test cover' }), 200, 'upload synthetic post cover')
    uploaded += 1
    await expectStatus(await session.json(`/api/admin/posts/${body.item.id}/publish`, 'POST'), 200, 'publish synthetic post')
    return body.item.id
  }
  if (item.targetKind === 'file') {
    const body = await responseJson(await session.json('/api/admin/files', 'POST', item.payload), 200, 'create synthetic file')
    await expectStatus(await session.upload(`/api/admin/files/${body.item.id}/upload`, 'phase9-synthetic.txt', 'text/plain', textFile), 200, 'upload synthetic file')
    uploaded += 1
    await expectStatus(await session.json(`/api/admin/files/${body.item.id}/publish`, 'POST'), 200, 'publish synthetic file')
    return body.item.id
  }
  if (item.targetKind === 'faq') {
    const body = await responseJson(await session.json('/api/admin/faq', 'POST', item.payload), 200, 'create synthetic FAQ')
    return body.item.id
  }
  if (item.targetKind === 'year-summary') {
    const fileTarget = targets['synthetic:file:controlled-migration']?.id
    const body = await responseJson(await session.json('/api/admin/years', 'POST', { ...item.payload, reportFileId: fileTarget }), 200, 'create synthetic year')
    await expectStatus(await session.upload(`/api/admin/years/${body.item.id}/cover`, 'phase9-synthetic.png', 'image/png', png, { altText: 'Synthetic one-pixel test cover' }), 200, 'upload synthetic year cover')
    uploaded += 1
    await expectStatus(await session.json(`/api/admin/years/${body.item.id}/publish`, 'POST'), 200, 'publish synthetic year')
    return body.item.id
  }
  throw new Error(`Unsupported synthetic target: ${item.targetKind}`)
}

try {
  for (const item of syntheticItems) {
    const existing = await sourceRef(client, item)
    if (existing && existing.normalized_sha256 === item.normalizedHash) {
      targets[item.sourceKey] = { id: existing.target_id, kind: item.targetKind, naturalKey: item.naturalKey }
      skipped += 1
      continue
    }
    if (existing) throw new Error(`Controlled update is required for changed synthetic source ${item.sourceKey}`)
    const id = await createTarget(item)
    targets[item.sourceKey] = { id, kind: item.targetKind, naturalKey: item.naturalKey }
    await recordRef(client, runId, item, id)
    created += 1
  }
  const summary = { mode: modeArg, sourceMode: 'synthetic', created, updated: 0, skipped, conflicted: 0, failed: 0, uploadedObjects: uploaded, runKey: syntheticRunKey, sourceSnapshotSha256: syntheticSnapshotHash }
  await finishRun(client, runId, 'completed', summary)
  const state = { runId, runKey: syntheticRunKey, sourceSnapshotSha256: syntheticSnapshotHash, targets }
  await writeState(state)
  await updateRollbackManifest(state)
  await writeRuntimeResult(modeArg, summary)
  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  await finishRun(client, runId, 'failed', { mode: modeArg, created, updated: 0, skipped, conflicted: 0, failed: 1, message: 'Synthetic apply failed; inspect local logs.' }).catch(() => {})
  throw error
} finally {
  await client.auth.signOut({ scope: 'local' })
}
