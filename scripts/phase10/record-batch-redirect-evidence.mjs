import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { phase9SnapshotSha256, root, sha256, writePrivateJson } from './lib/core.mjs'
import { createAppSession, requireMutationEvidence, responseJson } from './lib/runtime.mjs'

const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const mode = option('mode') || 'dry-run'
const manifestArg = option('manifest') || ''
const origin = new URL(option('origin') || '')
if (!['dry-run', 'record', 'resume', 'second-record'].includes(mode) || !manifestArg
  || origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.hostname.endsWith('.invalid')) {
  throw new Error('A mode, in-repository manifest, and real origin-only HTTPS URL are required')
}
const manifestPath = resolve(root, manifestArg)
if (!manifestPath.startsWith(root)) throw new Error('Release manifest must be inside the repository')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.schemaVersion !== 1 || manifest.sourceSnapshotSha256 !== phase9SnapshotSha256 || !Array.isArray(manifest.items)) throw new Error('Invalid release manifest')
const manifestSha256 = sha256(manifest)
const statePath = `.phase10-cache/releases/${manifest.batchKey}-redirect-evidence.json`
const session = await createAppSession()
const [batchResponse, redirectResponse] = await Promise.all([
  responseJson(await session.request(`/api/admin/editorial/releases/${manifest.batchKey}`), 200, 'release batch'),
  responseJson(await session.request('/api/admin/editorial/redirects'), 200, 'redirect list')
])
const batchItems = new Map(batchResponse.item.items.map((item) => [item.sourceKey, item]))
const redirects = new Map(redirectResponse.items.map((item) => [item.redirectKey, item]))
const operations = manifest.items.flatMap((manifestItem) => manifestItem.redirectKeys.map((redirectKey) => {
  const batchItem = batchItems.get(manifestItem.sourceKey)
  const redirect = redirects.get(redirectKey)
  if (!batchItem || !['applied', 'verified'].includes(batchItem.status) || !batchItem.postTargetVersion
    || !redirect?.targetPath || redirect.sourceKey !== manifestItem.sourceKey) throw new Error(`Redirect is not linked to an applied target: ${redirectKey}`)
  return { redirectKey, targetPath: redirect.targetPath, targetVersion: batchItem.postTargetVersion }
}))
const checkTarget = async (operation) => {
  const url = new URL(operation.targetPath, origin)
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'phase10-batch-target-verifier/1.0' } })
  await response.body?.cancel()
  if (response.status !== 200 || response.headers.has('location')) throw new Error(`Target is not direct 200: ${operation.redirectKey}`)
  return { redirectKey: operation.redirectKey, finalStatus: 200, finalUrl: url.href, hops: 1 }
}
if (mode === 'dry-run') {
  const checks = []
  for (const operation of operations) checks.push(await checkTarget(operation))
  const result = { mode, status: 'validated', manifestSha256, redirects: checks.length, origin: origin.origin, databaseMutations: 0, storageMutations: 0 }
  await writePrivateJson(statePath, result)
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}
requireMutationEvidence()
let state = { manifestSha256, origin: origin.origin, nextIndex: 0, recorded: [] }
if (mode === 'resume') {
  try { state = JSON.parse(await readFile(resolve(root, statePath), 'utf8')) } catch { throw new Error('No redirect evidence checkpoint is available to resume') }
}
for (let index = state.nextIndex; index < operations.length; index += 1) {
  const operation = operations[index]
  const response = await responseJson(await session.json(`/api/admin/editorial/redirects/${operation.redirectKey}/verify`, 'POST', {
    verifiedOrigin: origin.origin, targetVersion: operation.targetVersion
  }), 200, `record redirect evidence ${operation.redirectKey}`)
  if (mode === 'second-record' && response.idempotent !== true) throw new Error(`Second evidence record was not idempotent: ${operation.redirectKey}`)
  state.recorded.push({ redirectKey: operation.redirectKey, idempotent: response.idempotent === true })
  state.nextIndex = index + 1
  await writePrivateJson(statePath, state)
}
console.log(JSON.stringify({ mode, status: 'completed', manifestSha256, recorded: operations.length, idempotent: mode === 'second-record' }, null, 2))
