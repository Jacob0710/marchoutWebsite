import { assertNoSecretShape, phase9SnapshotSha256, readCsv, redirectKeyForSource, sha256, writePrivateJson } from './lib/core.mjs'
import { createAppSession, responseJson } from './lib/runtime.mjs'

const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const mode = option('mode') || 'dry-run'
const output = option('output') || '.phase10-private/redirect-state.json'
if (!['dry-run', 'snapshot', 'resume'].includes(mode)) throw new Error(`Unsupported redirect snapshot mode: ${mode}`)

const phase9 = await readCsv('migration/phase9/url-redirects.csv')
if (phase9.length !== 83) throw new Error('Phase 9 redirect cardinality mismatch')
const baselineByKey = new Map(phase9.map((row) => [redirectKeyForSource(row.source_key, row.source_path), row]))
const session = await createAppSession()
const redirectsResponse = await responseJson(await session.request('/api/admin/editorial/redirects'), 200, 'redirect state')
const queueResponse = await responseJson(await session.request('/api/admin/editorial?targetKind=redirect&limit=100&offset=0'), 200, 'redirect review queue')
if (redirectsResponse.items.length !== 83 || queueResponse.items.length !== 52 || queueResponse.total !== 52) throw new Error('Editorial redirect state is incomplete')

const details = []
for (let index = 0; index < queueResponse.items.length; index += 4) {
  details.push(...await Promise.all(queueResponse.items.slice(index, index + 4).map(async (review) => (
    await responseJson(await session.request(`/api/admin/editorial/${review.reviewKey}`), 200, `redirect review ${review.reviewKey}`)
  ).item)))
}
const reviewByRedirectKey = new Map(details.map((item) => [item.redirect.redirectKey, item.review]))
const items = redirectsResponse.items.map((item) => {
  const baseline = baselineByKey.get(item.redirectKey)
  if (!baseline || baseline.source_key !== item.sourceKey || baseline.source_path !== item.sourcePath
    || (baseline.target_path || null) !== item.targetPath) throw new Error(`Redirect/provenance mismatch: ${item.redirectKey}`)
  const review = reviewByRedirectKey.get(item.redirectKey)
  return {
    ...item,
    reviewKey: review?.reviewKey || null,
    reviewState: review?.state || null,
    reviewDecision: review?.decision || null,
    publicTargetVerified: review?.publicTargetVerified === true
  }
})
const state = {
  schemaVersion: 1,
  sourceSnapshotSha256: phase9SnapshotSha256,
  canonicalOrigin: option('canonical-origin') || null,
  sourceHosts: (option('source-hosts') || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean),
  items
}
assertNoSecretShape(state, 'redirect state snapshot')
const result = { mode, status: 'validated', redirects: items.length, reviews: details.length, stateSha256: sha256(state), databaseMutations: 0, storageMutations: 0 }
if (mode !== 'dry-run') await writePrivateJson(output, state)
console.log(JSON.stringify({ ...result, ...(mode === 'dry-run' ? {} : { status: 'snapshotted', output }) }, null, 2))
