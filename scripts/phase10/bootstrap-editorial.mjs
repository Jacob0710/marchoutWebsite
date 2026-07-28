import { assertNoSecretShape, gitHead, phase9SnapshotSha256, readCsv, readJsonl, redirectKeyForSource, sha256, writePrivateJson } from './lib/core.mjs'
import { createAdminClient, createAppSession, requireMutationEvidence, responseJson } from './lib/runtime.mjs'

const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || 'dry-run'
if (!['dry-run', 'apply', 'resume'].includes(mode)) throw new Error(`Unsupported bootstrap mode: ${mode}`)

const content = (await readJsonl('migration/phase9/content-manifest.jsonl')).filter((item) => item.desiredStatus === 'draft')
const assetAssignments = await readJsonl('migration/phase9/assets-manifest.jsonl')
const redirectRows = await readCsv('migration/phase9/url-redirects.csv')
const reviewRows = await readCsv('migration/phase9/manual-review.csv')
if (content.length !== 70 || assetAssignments.length !== 378 || redirectRows.length !== 83 || reviewRows.length !== 122) throw new Error('Phase 9 manifest reconciliation failed before bootstrap')

const session = await createAppSession()
const client = await createAdminClient()
const targets = []
try {
  for (const item of content) {
    const { data: refData, error: refError } = await client.rpc('phase9_get_source_ref', {
      p_source_system: 'wix', p_source_kind: item.sourceKind, p_source_key: item.sourceKey
    })
    if (refError) throw new Error(`Provenance read failed for ${item.migrationKey}: ${refError.message}`)
    const ref = refData?.[0]
    if (!ref || ref.source_sha256 !== item.sourceHash || ref.normalized_sha256 !== item.normalizedHash || ref.target_kind !== item.targetKind) throw new Error(`Provenance mismatch: ${item.migrationKey}`)
    let detail
    if (item.targetKind === 'activity') detail = (await responseJson(await session.request(`/api/admin/activities/${ref.target_id}`), 200, item.migrationKey)).activity
    else if (item.targetKind === 'file') detail = (await responseJson(await session.request(`/api/admin/files/${ref.target_id}`), 200, item.migrationKey)).item
    else if (item.targetKind === 'year-summary') detail = (await responseJson(await session.request(`/api/admin/years/${ref.target_id}`), 200, item.migrationKey)).item
    else throw new Error(`Unexpected Phase 10 target kind: ${item.targetKind}`)
    if (detail.status !== 'draft' || detail.publishedAt !== null) throw new Error(`Target is no longer a Phase 9 draft: ${item.migrationKey}`)

    const assignments = assetAssignments.filter((asset) => asset.ownerMigrationKey === item.migrationKey)
    const assets = []
    if (item.targetKind === 'activity') {
      const unused = new Set(detail.assets.map((asset) => asset.id))
      for (const assignment of assignments) {
        const match = detail.assets.find((asset) => unused.has(asset.id)
          && asset.originalName === assignment.originalFilename
          && asset.mimeType === assignment.detectedMimeType
          && asset.sizeBytes === assignment.byteSize)
        if (!match) throw new Error(`Activity asset reconciliation failed: ${assignment.assetKey}`)
        unused.delete(match.id)
        assets.push({ assetId: match.id, sourceSha256: assignment.sourceSha256 })
      }
      if (unused.size || assets.length !== item.assetKeys.length) throw new Error(`Activity asset cardinality mismatch: ${item.migrationKey}`)
    } else if (item.targetKind === 'file') {
      if (assignments.length !== 1 || !detail.hasUpload || detail.originalFilename !== assignments[0].originalFilename
        || detail.mimeType !== assignments[0].detectedMimeType || detail.sizeBytes !== assignments[0].byteSize) throw new Error(`File asset reconciliation failed: ${item.migrationKey}`)
      assets.push({ assetId: detail.id, sourceSha256: assignments[0].sourceSha256 })
    } else if (assignments.length) throw new Error(`Unexpected year asset assignment: ${item.migrationKey}`)

    targets.push({
      sourceKey: item.sourceKey, sourceSha256: item.sourceHash, normalizedSha256: item.normalizedHash,
      targetKind: item.targetKind, targetId: ref.target_id, targetNaturalKey: item.targetNaturalKey,
      observedTargetVersion: detail.updatedAt, assets
    })
  }

  const targetBySource = new Map(targets.map((target) => [target.sourceKey, target]))
  const head = await gitHead()
  const redirects = redirectRows.map((row) => ({
    redirectKey: redirectKeyForSource(row.source_key, row.source_path),
    sourceKey: row.source_key,
    sourceUrl: row.source_url,
    sourcePath: row.source_path,
    targetPath: row.target_path,
    statusCode: Number(row.status_code),
    disposition: !row.target_path ? 'utility-archive' : Number(row.status_code) === 301 ? 'structural-candidate' : 'draft-target',
    targetVersion: targetBySource.get(row.source_key)?.observedTargetVersion || `git:${head}:${row.target_path || row.source_key}`
  }))
  const redirectKeyBySource = new Map(redirectRows.map((row) => [`${row.source_key}\0${row.source_url}`, redirectKeyForSource(row.source_key, row.source_path)]))
  const reviews = reviewRows.map((row) => ({
    reviewKey: row.review_id, severity: row.severity, sourceKey: row.source_key,
    redirectKey: row.target_kind === 'redirect' ? redirectKeyBySource.get(`${row.source_key}\0${row.source_url}`) : null,
    sourceUrl: row.source_url, targetKind: row.target_kind, issueCode: row.issue_code,
    description: row.description, recommendedAction: row.recommended_action,
    phase9Resolution: row.resolution
  }))
  const payloadBody = { sourceSnapshotSha256: phase9SnapshotSha256, targets, redirects, reviews }
  const manifestSha256 = sha256(payloadBody)
  const payload = { ...payloadBody, manifestSha256 }
  assertNoSecretShape(payload, 'editorial bootstrap payload')
  await writePrivateJson('.phase10-private/phase10-bootstrap-payload.json', payload)
  const counts = {
    targets: targets.length,
    targetKinds: Object.fromEntries(['activity', 'file', 'year-summary'].map((kind) => [kind, targets.filter((target) => target.targetKind === kind).length])),
    assets: targets.reduce((total, target) => total + target.assets.length, 0),
    redirects: redirects.length,
    redirectDispositions: Object.fromEntries(['structural-candidate', 'draft-target', 'utility-archive'].map((kind) => [kind, redirects.filter((redirect) => redirect.disposition === kind).length])),
    reviews: reviews.length,
    highReviews: reviews.filter((review) => review.severity === 'high').length
  }
  const result = { mode, status: 'validated', sourceSnapshotSha256: phase9SnapshotSha256, manifestSha256, counts, databaseMutations: 0, storageMutations: 0 }
  await writePrivateJson('.phase10-cache/bootstrap-dry-run.json', result)
  if (mode === 'dry-run') {
    console.log(JSON.stringify(result, null, 2))
  } else {
    requireMutationEvidence()
    const response = await responseJson(await session.json('/api/admin/editorial/bootstrap', 'POST', payload), 200, 'editorial bootstrap')
    const applied = { ...result, status: 'applied', bootstrap: response.bootstrap, databaseRowCreates: 275, privacyClassifications: 'derived-transactionally-from-high-review-evidence', storageMutations: 0 }
    await writePrivateJson('.phase10-cache/bootstrap-state.json', applied)
    console.log(JSON.stringify(applied, null, 2))
  }
} finally {
  await client.auth.signOut({ scope: 'local' })
}
