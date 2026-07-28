import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { canonicalize, phase9SnapshotSha256, root, sha256, writePrivateJson } from './lib/core.mjs'
import { createAppSession, responseJson } from './lib/runtime.mjs'

const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const mode = option('mode') || 'dry-run'
const batchKey = option('batch-key') || ''
const reviewKeys = (option('reviews') || '').split(',').map((item) => item.trim()).filter(Boolean)
if (!['dry-run', 'write'].includes(mode) || !/^[a-z0-9][a-z0-9-]{2,99}$/.test(batchKey)
  || reviewKeys.length < 1 || reviewKeys.length > 70 || new Set(reviewKeys).size !== reviewKeys.length
  || reviewKeys.some((key) => !/^P9-[0-9]{4}$/.test(key))) {
  throw new Error('A valid batch key and 1-70 explicit review keys are required')
}

const session = await createAppSession()
const [details, redirectResponse] = await Promise.all([
  Promise.all(reviewKeys.map(async (key) => (await responseJson(await session.request(`/api/admin/editorial/${key}`), 200, `release review ${key}`)).item)),
  responseJson(await session.request('/api/admin/editorial/redirects'), 200, 'release redirects')
])
if (details.some((detail) => !detail.target || detail.review.targetKind === 'redirect')) throw new Error('Release manifest reviews must resolve to content targets')
if (new Set(details.map((detail) => detail.target.id)).size !== details.length) throw new Error('Each release item must identify a different editorial target')

const items = details.map((detail) => {
  if (detail.review.state !== 'resolved' || detail.review.decision !== 'publish'
    || !detail.review.contentVerified || !detail.review.privacyVerified || !detail.review.authorizationVerified
    || detail.target.decision !== 'publish' || detail.target.targetVersion !== detail.review.targetVersion
    || detail.assets.some((asset) => asset.privacyState === 'redaction-required')) {
    throw new Error(`Review is not release-ready: ${detail.review.reviewKey}`)
  }
  const linkedRedirects = redirectResponse.items
    .filter((redirect) => redirect.sourceKey === detail.target.sourceKey && redirect.phase9Disposition === 'draft-target')
    .map((redirect) => redirect.redirectKey).sort()
  return {
    sourceKey: detail.target.sourceKey,
    targetKind: detail.target.targetKind,
    targetId: detail.target.targetId,
    reviewKeys: [detail.review.reviewKey],
    expectedTargetVersion: detail.target.targetVersion,
    redirectKeys: linkedRedirects
  }
})
const redirectKeys = items.flatMap((item) => item.redirectKeys)
if (new Set(redirectKeys).size !== redirectKeys.length) throw new Error('A redirect cannot be linked to more than one release item')
const manifest = {
  schemaVersion: 1,
  sourceSnapshotSha256: phase9SnapshotSha256,
  batchKey,
  requestedAction: 'publish',
  ...(option('safety-checkpoint-key') ? { safetyCheckpointKey: option('safety-checkpoint-key') } : {}),
  items
}
const manifestSha256 = sha256(manifest)
const summary = { mode, batchKey, manifestSha256, items: items.length, reviews: reviewKeys.length, redirects: redirectKeys.length }
if (mode === 'dry-run') {
  await writePrivateJson(`.phase10-cache/releases/${batchKey}-manifest-dry-run.json`, { manifest, summary, databaseMutations: 0, storageMutations: 0 })
  console.log(JSON.stringify({ ...summary, status: 'validated', databaseMutations: 0, storageMutations: 0 }, null, 2))
  process.exit(0)
}
if (process.env.PHASE10_RELEASE_MANIFEST_WRITE_CONFIRM !== manifestSha256) {
  throw new Error('PHASE10_RELEASE_MANIFEST_WRITE_CONFIRM must equal the manifest SHA-256')
}
const output = `migration/phase10/releases/${batchKey}.json`
await mkdir(dirname(resolve(root, output)), { recursive: true })
await writeFile(resolve(root, output), `${JSON.stringify(canonicalize(manifest), null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ ...summary, status: 'written', output }, null, 2))
