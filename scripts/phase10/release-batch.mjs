import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { phase9SnapshotSha256, root, sha256, writePrivateJson } from './lib/core.mjs'
import { createAppSession, requireMutationEvidence, responseJson } from './lib/runtime.mjs'

const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || 'dry-run'
const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='))?.slice('--manifest='.length)
const maxItems = Number(process.argv.find((arg) => arg.startsWith('--max-items='))?.split('=')[1] || 10)
const runAll = process.argv.includes('--all')
if (!['dry-run', 'apply', 'resume', 'verify', 'second-apply', 'activate-redirects', 'rollback'].includes(mode)) throw new Error(`Unsupported release mode: ${mode}`)
if (!manifestArg) throw new Error('--manifest is required; release batches never infer all drafts')
if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 25) throw new Error('--max-items must be between 1 and 25')
const manifestPath = resolve(root, manifestArg)
if (!manifestPath.startsWith(root)) throw new Error('Release manifest must be inside the repository')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.schemaVersion !== 1 || manifest.sourceSnapshotSha256 !== phase9SnapshotSha256
  || !/^[a-z0-9][a-z0-9-]{2,99}$/.test(manifest.batchKey || '')
  || manifest.requestedAction !== 'publish' || !Array.isArray(manifest.items)
  || manifest.items.length < 1 || manifest.items.length > 70
  || new Set(manifest.items.map((item) => item?.sourceKey)).size !== manifest.items.length
  || new Set(manifest.items.map((item) => item?.targetId)).size !== manifest.items.length
  || manifest.items.some((item) => !item || typeof item.sourceKey !== 'string' || !item.sourceKey.startsWith('wix:')
    || !['activity', 'file', 'year-summary'].includes(item.targetKind)
    || typeof item.targetId !== 'string' || !Array.isArray(item.reviewKeys) || item.reviewKeys.length < 1
    || !item.reviewKeys.every((key) => /^P9-[0-9]{4}$/.test(key))
    || typeof item.expectedTargetVersion !== 'string' || !item.expectedTargetVersion
    || !Array.isArray(item.redirectKeys) || !item.redirectKeys.every((key) => /^R9-[0-9a-f]{24}$/.test(key)))) {
  throw new Error('Invalid explicit Phase 10 release manifest')
}
const redirectKeys = manifest.items.flatMap((item) => item.redirectKeys)
if (new Set(manifest.items.flatMap((item) => item.reviewKeys)).size !== manifest.items.flatMap((item) => item.reviewKeys).length
  || new Set(redirectKeys).size !== redirectKeys.length) throw new Error('Release review/redirect ids must be unique across the batch')
const manifestSha256 = sha256(manifest)
const statePath = `.phase10-cache/releases/${manifest.batchKey}.json`
const session = await createAppSession()

const plan = (planMode, safetyCheckpointKey = null) => session.json('/api/admin/editorial/releases/plan', 'POST', {
  batchKey: manifest.batchKey,
  manifestSha256,
  items: manifest.items,
  mode: planMode,
  safetyCheckpointKey
})

if (mode === 'dry-run') {
  const before = await responseJson(await session.request('/api/admin/editorial/reconciliation'), 200, 'pre-dry-run reconciliation')
  const result = await responseJson(await plan('dry-run'), 200, 'release dry-run')
  const after = await responseJson(await session.request('/api/admin/editorial/reconciliation'), 200, 'post-dry-run reconciliation')
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Release dry-run changed editorial state')
  const output = { mode, manifestSha256, batch: result.batch, databaseMutations: 0, storageMutations: 0, reconciliationUnchanged: true }
  await writePrivateJson(statePath, output)
  console.log(JSON.stringify(output, null, 2))
  process.exit(0)
}

const evidence = requireMutationEvidence()
const safetyCheckpointKey = manifest.safetyCheckpointKey || evidence.backupCheckpointId
const registerSafety = async () => responseJson(await session.json('/api/admin/editorial/releases/safety-checkpoints', 'POST', {
  checkpointKey: safetyCheckpointKey,
  environment: process.env.PHASE10_ENVIRONMENT || 'staging',
  databaseBackupId: evidence.backupCheckpointId,
  databaseEvidenceSha256: evidence.databaseEvidenceSha256,
  storageInventorySha256: evidence.storageInventorySha256,
  restoreEvidenceSha256: evidence.restoreEvidenceSha256,
  restoreRehearsedAt: evidence.restoreRehearsedAt
}), 200, 'register safety checkpoint')

if (mode === 'apply') {
  await registerSafety()
  const planned = await responseJson(await plan('apply', safetyCheckpointKey), 200, 'plan release batch')
  let batch = planned.batch
  do {
    const applied = await responseJson(await session.json(`/api/admin/editorial/releases/${manifest.batchKey}/apply`, 'POST', {
      checkpointToken: batch.checkpointToken,
      maxItems
    }), 200, 'apply release checkpoint')
    batch = applied.batch
    await writePrivateJson(statePath, { mode, manifestSha256, safetyCheckpointKey, batch })
    if (batch.status === 'failed') throw new Error(`Release stopped at position ${batch.failedPosition}: ${batch.errorCode}`)
  } while (runAll && batch.status !== 'completed')
  console.log(JSON.stringify({ mode, manifestSha256, batch }, null, 2))
  process.exit(0)
}

const current = await responseJson(await session.request(`/api/admin/editorial/releases/${manifest.batchKey}`), 200, 'read release batch')
const batch = current.item.batch
if (mode === 'resume') {
  const applied = await responseJson(await session.json(`/api/admin/editorial/releases/${manifest.batchKey}/apply`, 'POST', {
    checkpointToken: batch.checkpointToken,
    maxItems
  }), 200, 'resume release checkpoint')
  await writePrivateJson(statePath, { mode, manifestSha256, safetyCheckpointKey, batch: applied.batch })
  if (applied.batch.status === 'failed') throw new Error(`Release stopped at position ${applied.batch.failedPosition}: ${applied.batch.errorCode}`)
  console.log(JSON.stringify({ mode, manifestSha256, batch: applied.batch }, null, 2))
} else if (mode === 'verify') {
  const verified = await responseJson(await session.json(`/api/admin/editorial/releases/${manifest.batchKey}/verify`, 'POST'), 200, 'verify release batch')
  await writePrivateJson(statePath, { mode, manifestSha256, verification: verified.verification })
  console.log(JSON.stringify({ mode, manifestSha256, verification: verified.verification }, null, 2))
} else if (mode === 'second-apply') {
  const planned = await responseJson(await plan('apply', safetyCheckpointKey), 200, 'idempotent re-plan')
  const reapplied = await responseJson(await session.json(`/api/admin/editorial/releases/${manifest.batchKey}/apply`, 'POST', {
    checkpointToken: planned.batch.checkpointToken,
    maxItems
  }), 200, 'idempotent second apply')
  if (!reapplied.batch.idempotent || reapplied.batch.processed !== 0) throw new Error('Second apply was not idempotent')
  console.log(JSON.stringify({ mode, manifestSha256, batch: reapplied.batch }, null, 2))
} else if (mode === 'activate-redirects') {
  const activationState = { mode, manifestSha256, nextIndex: 0, activated: [] }
  for (const redirectKey of redirectKeys) {
    const activated = await responseJson(await session.json(`/api/admin/editorial/releases/${manifest.batchKey}/redirects/${redirectKey}/activate`, 'POST'), 200, `activate ${redirectKey}`)
    activationState.activated.push(activated.redirect)
    activationState.nextIndex += 1
    await writePrivateJson(statePath, activationState)
  }
  console.log(JSON.stringify({ mode, manifestSha256, activated: activationState.activated.length }, null, 2))
} else if (mode === 'rollback') {
  const rolledBack = await responseJson(await session.json(`/api/admin/editorial/releases/${manifest.batchKey}/rollback`, 'POST', {
    checkpointToken: batch.checkpointToken
  }), 200, 'rollback release batch')
  await writePrivateJson(statePath, { mode, manifestSha256, rollback: rolledBack.rollback })
  console.log(JSON.stringify({ mode, manifestSha256, rollback: rolledBack.rollback }, null, 2))
}
