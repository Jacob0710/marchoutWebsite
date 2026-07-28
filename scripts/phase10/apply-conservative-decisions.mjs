import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { root, writePrivateJson } from './lib/core.mjs'
import { createAppSession, requireMutationEvidence, responseJson } from './lib/runtime.mjs'

const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || 'dry-run'
const maxItems = Number(process.argv.find((arg) => arg.startsWith('--max-items='))?.split('=')[1] || 25)
const runAll = process.argv.includes('--all')
if (!['dry-run', 'apply', 'resume', 'second-apply', 'rollback'].includes(mode)) throw new Error(`Unsupported decision mode: ${mode}`)
if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 50) throw new Error('--max-items must be between 1 and 50')
const editorial = JSON.parse(await readFile(resolve(root, 'migration/phase10/editorial-decisions.json'), 'utf8'))
const redirects = JSON.parse(await readFile(resolve(root, 'migration/phase10/redirect-decisions.json'), 'utf8'))
if (editorial.summary.total !== 70 || redirects.summary.total !== 83) throw new Error('Conservative decision manifest reconciliation failed')
const operations = [
  ...editorial.decisions.map((decision) => ({ kind: 'review', ...decision })),
  ...redirects.decisions.filter((decision) => decision.reviewKey).map((decision) => ({ kind: 'review', ...decision })),
  ...redirects.decisions.filter((decision) => !decision.reviewKey).map((decision) => ({ kind: 'redirect', ...decision }))
]
if (operations.length !== 153) throw new Error(`Expected 153 decision operations, found ${operations.length}`)
const statePath = '.phase10-cache/conservative-decisions-state.json'

if (mode === 'dry-run') {
  const session = await createAppSession()
  const getReview = async (key) => (await responseJson(await session.request(`/api/admin/editorial/${key}`), 200, `read ${key}`)).item
  const listRedirects = async () => (await responseJson(await session.request('/api/admin/editorial/redirects'), 200, 'list redirects')).items
  let valid = 0
  const redirectMap = new Map((await listRedirects()).map((item) => [item.redirectKey, item]))
  for (const operation of operations) {
    if (operation.kind === 'review') {
      const item = await getReview(operation.reviewKey)
      if (item.review.sourceKey !== operation.sourceKey) throw new Error(`Review/source mismatch: ${operation.reviewKey}`)
      valid += 1
    } else {
      const item = redirectMap.get(operation.redirectKey)
      if (!item || item.phase9Disposition !== operation.phase9Disposition) throw new Error(`Redirect mismatch: ${operation.sourceKey}`)
      valid += 1
    }
  }
  const result = { mode, status: 'validated', operations: valid, reviews: 122, directRedirectDecisions: 31, databaseMutations: 0, storageMutations: 0 }
  await writePrivateJson('.phase10-cache/conservative-decisions-dry-run.json', result)
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

requireMutationEvidence()
let state
try { state = JSON.parse(await readFile(resolve(root, statePath), 'utf8')) } catch { state = { schemaVersion: 1, status: 'running', nextIndex: 0, applied: [], skipped: [] } }
if (state.status === 'completed' && mode !== 'rollback') {
  console.log(JSON.stringify({ mode, status: 'completed', applied: 0, skipped: operations.length, idempotent: true }, null, 2))
  process.exit(0)
}

const session = await createAppSession()
const getReview = async (key) => (await responseJson(await session.request(`/api/admin/editorial/${key}`), 200, `read ${key}`)).item
const updateReview = async (key, body) => responseJson(await session.json(`/api/admin/editorial/${key}`, 'PATCH', body), 200, `update ${key}`)
const listRedirects = async () => (await responseJson(await session.request('/api/admin/editorial/redirects'), 200, 'list redirects')).items
const updateRedirect = async (redirectKey, body) => responseJson(await session.json(`/api/admin/editorial/redirects/${encodeURIComponent(redirectKey)}`, 'PATCH', body), 200, `update ${redirectKey}`)

if (mode === 'rollback') {
  let rolledBack = 0
  for (const record of [...state.applied].reverse()) {
    if (record.rolledBack) continue
    if (record.kind === 'review') {
      const current = await getReview(record.reviewKey)
      const before = record.before
      await updateReview(record.reviewKey, {
        state: before.state, decision: before.decision, decisionReason: before.decisionReason || '',
        contentVerified: before.contentVerified, privacyVerified: before.privacyVerified,
        authorizationVerified: before.authorizationVerified, publicTargetVerified: before.publicTargetVerified,
        targetVersion: current.target?.targetVersion || current.redirect?.targetVersion || current.review.targetVersion
      })
    } else {
      await updateRedirect(record.redirectKey, { decision: record.before.decision, decisionReason: record.before.decisionReason || '' })
    }
    record.rolledBack = true; rolledBack += 1
    await writePrivateJson(statePath, state)
  }
  state.status = 'rolled-back'; await writePrivateJson(statePath, state)
  console.log(JSON.stringify({ mode, status: state.status, rolledBack, idempotent: rolledBack === 0 }, null, 2))
  process.exit(0)
}

let processed = 0
let redirectMap = null
while (state.nextIndex < operations.length && processed < (runAll ? operations.length : maxItems)) {
  const operation = operations[state.nextIndex]
  if (operation.kind === 'review') {
    const item = await getReview(operation.reviewKey)
    const desiredDecision = operation.decision
    if (item.review.state === operation.state && item.review.decision === desiredDecision && item.review.decisionReason === operation.reason) {
      state.skipped.push({ kind: operation.kind, reviewKey: operation.reviewKey })
    } else {
      const before = {
        state: item.review.state, decision: item.review.decision, decisionReason: item.review.decisionReason,
        contentVerified: item.review.contentVerified, privacyVerified: item.review.privacyVerified,
        authorizationVerified: item.review.authorizationVerified, publicTargetVerified: item.review.publicTargetVerified
      }
      await updateReview(operation.reviewKey, {
        state: operation.state, decision: desiredDecision, decisionReason: operation.reason,
        contentVerified: false, privacyVerified: false, authorizationVerified: false,
        publicTargetVerified: false,
        targetVersion: item.target?.targetVersion || item.redirect?.targetVersion || item.review.targetVersion
      })
      state.applied.push({ kind: operation.kind, reviewKey: operation.reviewKey, before, rolledBack: false })
    }
  } else {
    redirectMap ||= new Map((await listRedirects()).map((item) => [item.redirectKey, item]))
    const item = redirectMap.get(operation.redirectKey)
    if (!item) throw new Error(`Redirect not found: ${operation.sourceKey}`)
    if (item.decision === operation.decision && item.decisionReason === operation.reason) {
      state.skipped.push({ kind: operation.kind, redirectKey: operation.redirectKey, sourceKey: operation.sourceKey })
    } else {
      await updateRedirect(operation.redirectKey, { decision: operation.decision, decisionReason: operation.reason })
      state.applied.push({ kind: operation.kind, redirectKey: operation.redirectKey, sourceKey: operation.sourceKey, before: { decision: item.decision, decisionReason: item.decisionReason }, rolledBack: false })
      redirectMap.set(operation.redirectKey, { ...item, decision: operation.decision, decisionReason: operation.reason })
    }
  }
  state.nextIndex += 1; processed += 1
  await writePrivateJson(statePath, state)
}
if (state.nextIndex === operations.length) state.status = 'completed'
await writePrivateJson(statePath, state)
console.log(JSON.stringify({ mode, status: state.status, processed, nextIndex: state.nextIndex, total: operations.length, applied: state.applied.length, skipped: state.skipped.length, idempotent: processed === 0 }, null, 2))
