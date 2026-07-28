import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { encodedLegacyPathForSource, phase9SnapshotSha256, readCsv, readJsonl, redirectKeyForSource, root, sha256 } from './lib/core.mjs'

const outputDir = resolve(root, 'migration/phase10')
await mkdir(outputDir, { recursive: true })
const content = (await readJsonl('migration/phase9/content-manifest.jsonl')).filter((item) => item.desiredStatus === 'draft')
const reviews = await readCsv('migration/phase9/manual-review.csv')
const redirects = await readCsv('migration/phase9/url-redirects.csv')
if (content.length !== 70 || reviews.length !== 122 || redirects.length !== 83) throw new Error('Phase 9 decision baseline mismatch')

const reviewBySource = new Map(reviews.filter((review) => review.target_kind !== 'redirect').map((review) => [review.source_key, review]))
const targetDecisions = content.map((item) => {
  const review = reviewBySource.get(item.sourceKey)
  if (!review) throw new Error(`Content review missing for ${item.sourceKey}`)
  return {
    reviewKey: review.review_id,
    sourceKey: item.sourceKey,
    targetKind: item.targetKind,
    state: 'deferred',
    decision: 'keep-draft',
    reasonCode: 'manual-content-privacy-authorization-evidence-required',
    reason: 'No item-specific content correctness, privacy clearance, and publication authorization evidence is available; keep this Phase 9 import private and draft.'
  }
})
const redirectReviewBySource = new Map(reviews.filter((review) => review.target_kind === 'redirect').map((review) => [review.source_key, review]))
const redirectDecisions = redirects.map((row) => {
  const disposition = !row.target_path ? 'utility-archive' : Number(row.status_code) === 301 ? 'structural-candidate' : 'draft-target'
  const review = redirectReviewBySource.get(row.source_key)
  if (disposition === 'draft-target' && !review) throw new Error(`Draft redirect review missing for ${row.source_key}`)
  return {
    redirectKey: redirectKeyForSource(row.source_key, row.source_path),
    reviewKey: review?.review_id ?? null,
    sourceKey: row.source_key,
    sourcePath: row.source_path,
    sourceEncodedPath: encodedLegacyPathForSource(row.source_path),
    targetPath: row.target_path || null,
    phase9Disposition: disposition,
    state: review ? 'deferred' : null,
    decision: disposition === 'utility-archive' ? 'archive' : 'keep-inactive',
    reasonCode: disposition === 'utility-archive' ? 'phase10-utility-archive-mandate'
      : disposition === 'draft-target' ? 'target-remains-private-draft'
        : 'actual-deployment-hostname-one-hop-200-evidence-required',
    reason: disposition === 'utility-archive'
      ? 'Phase 10 requires this utility route to remain archived; no 410 is authorized.'
      : disposition === 'draft-target'
        ? 'The mapped target remains a private draft and is not a valid redirect destination.'
        : 'No actual deployment hostname, DNS/TLS, or one-hop final-200 evidence is available; keep this structural candidate inactive.'
  }
})

const sourceEvidence = {
  canonicalContentManifestSha256: sha256(content),
  canonicalManualReviewSha256: sha256(reviews),
  canonicalRedirectsSha256: sha256(redirects)
}
const editorial = {
  schemaVersion: 1,
  sourceSnapshotSha256: phase9SnapshotSha256,
  sourceEvidence,
  policy: 'fail-closed-deferred-until-item-specific-evidence',
  summary: { total: 70, publish: 0, keepDraft: 70, archive: 0 },
  decisions: targetDecisions
}
const redirect = {
  schemaVersion: 1,
  sourceSnapshotSha256: phase9SnapshotSha256,
  sourceEvidence,
  policy: 'activate-only-after-approved-actual-one-hop-final-200-evidence',
  summary: { total: 83, activate: 0, keepInactive: 81, archive: 2, unauthorized410: 0 },
  decisions: redirectDecisions
}
for (const [name, value] of [['editorial-decisions.json', editorial], ['redirect-decisions.json', redirect]]) {
  await writeFile(resolve(outputDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}
console.log(JSON.stringify({ editorial: editorial.summary, redirects: redirect.summary, sourceEvidence }, null, 2))
