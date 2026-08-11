import { assertNoSensitiveMaterial, assertNoUrlValues, parseArgs, resolveRepositoryLocalPath, sha256, toCsv, writeText } from './lib.mjs'
import { normalizeProductionInventory } from './normalize-production-inventory.mjs'

export const reconciliationColumns = ['reconciliationId', 'classification', 'recordKind', 'recordKey', 'sourceIdentity', 'sourceCountDomain', 'productionCountDomain', 'duplicateStatistic', 'uniqueStatistic', 'evidenceReference', 'reason', 'decisionBoundary']

const observedRecords = inventory => [
  ...inventory.contentRecords.map(item => ({ recordKey: item.recordKey, recordKind: 'content', sourceIdentity: item.sourceIdentity, metadataFingerprint: item.metadataFingerprint, publicationState: item.publicationState, relationshipFingerprint: item.relationshipFingerprint, checksumSha256: null, evidenceReference: 'sanitized-inventory:contentRecords' })),
  ...inventory.storageObjects.map(item => ({ recordKey: item.objectKey, recordKind: 'storage-object', sourceIdentity: item.sourceIdentity, metadataFingerprint: item.metadataFingerprint, publicationState: 'not-applicable', relationshipFingerprint: null, checksumSha256: item.checksumSha256, evidenceReference: 'sanitized-inventory:storageObjects' })),
  ...inventory.relationships.map(item => ({ recordKey: item.relationshipKey, recordKind: 'relationship', sourceIdentity: item.sourceIdentity, metadataFingerprint: item.relationshipFingerprint, publicationState: 'not-applicable', relationshipFingerprint: item.relationshipFingerprint, checksumSha256: null, evidenceReference: 'sanitized-inventory:relationships', relationship: item }))
]

const makeResult = ({ classification, recordKind, recordKey, sourceIdentity = '', sourceCountDomain = '', productionCountDomain = '', evidenceReference = '', reason, decisionBoundary = 'automated-classification-owner-decision-required', duplicateStatistic = '', uniqueStatistic = '' }) => ({
  reconciliationId: `p14-${sha256(`${classification}|${recordKind}|${recordKey}|${reason}`).slice(0, 24)}`,
  classification, recordKind, recordKey, sourceIdentity: sourceIdentity || '', sourceCountDomain, productionCountDomain,
  duplicateStatistic, uniqueStatistic, evidenceReference, reason, decisionBoundary
})

export const reconcileInventory = async (baseline, rawInventory) => {
  if (baseline?.schemaVersion !== 1 || !Array.isArray(baseline.records) || !Array.isArray(baseline.evidenceDiscrepancies)) throw new Error('Invalid Phase 14 reconciliation baseline.')
  const inventory = await normalizeProductionInventory(rawInventory)
  const expected = new Map(baseline.records.map(item => [item.recordKey, item]))
  const observedList = observedRecords(inventory)
  const observed = new Map(observedList.map(item => [item.recordKey, item]))
  const results = []
  const keys = [...new Set([...expected.keys(), ...observed.keys()])].sort()
  for (const key of keys) {
    const left = expected.get(key)
    const right = observed.get(key)
    const common = { recordKind: left?.recordKind || right?.recordKind || 'unknown', recordKey: key, sourceIdentity: left?.sourceIdentity || right?.sourceIdentity, sourceCountDomain: left?.countDomain || '', productionCountDomain: right ? `production_${right.recordKind}` : '', evidenceReference: [left?.evidenceReference, right?.evidenceReference].filter(Boolean).join('|') }
    if (!left) {
      const orphan = right.relationship && (!right.relationship.recordKey || !inventory.contentRecords.some(item => item.recordKey === right.relationship.recordKey) || (right.relationship.objectKey && !inventory.storageObjects.some(item => item.objectKey === right.relationship.objectKey)))
      results.push(makeResult({ ...common, classification: orphan ? 'requires_owner_review' : 'production_only', reason: orphan ? 'Production relationship has a missing owner or object reference.' : 'Record exists only in the sanitized inventory.' }))
    } else if (!right) {
      results.push(makeResult({ ...common, classification: left.normalizedDisposition === 'accepted-skip' ? 'accepted_skip' : 'offline_only', reason: left.normalizedDisposition === 'accepted-skip' ? 'Repository evidence explicitly preserves accepted-skip for owner confirmation.' : 'Historical offline evidence has no matching sanitized inventory record.' }))
    } else if (left.checksumSha256 && right.checksumSha256 !== left.checksumSha256) {
      results.push(makeResult({ ...common, classification: 'asset_identity_mismatch', reason: 'Storage checksum differs from the offline evidence.' }))
    } else if (left.publicationState !== right.publicationState) {
      results.push(makeResult({ ...common, classification: 'publication_state_mismatch', reason: 'Publication state differs across count domains.' }))
    } else if (left.relationshipFingerprint !== right.relationshipFingerprint) {
      results.push(makeResult({ ...common, classification: 'relationship_mismatch', reason: 'Canonical relationship fingerprint differs.' }))
    } else if (left.metadataFingerprint !== right.metadataFingerprint) {
      results.push(makeResult({ ...common, classification: 'metadata_mismatch', reason: 'Allowlisted metadata fingerprint differs.' }))
    } else {
      results.push(makeResult({ ...common, classification: left.normalizedDisposition === 'accepted-skip' ? 'accepted_skip' : 'matched', reason: left.normalizedDisposition === 'accepted-skip' ? 'Accepted-skip evidence matches and still requires owner confirmation.' : 'Stable identity and all comparable fingerprints match.', decisionBoundary: left.normalizedDisposition === 'accepted-skip' ? 'owner-decision-required' : 'automated-match-no-publication-decision' }))
    }
  }
  const identityGroups = Map.groupBy(observedList.filter(item => item.sourceIdentity), item => item.sourceIdentity)
  for (const [identity, rows] of [...identityGroups.entries()].filter(([, rows]) => rows.length > 1).sort(([a], [b]) => a.localeCompare(b))) {
    results.push(makeResult({ classification: 'requires_owner_review', recordKind: 'source-identity-group', recordKey: identity, sourceIdentity: identity, productionCountDomain: 'production_source_identity', evidenceReference: rows.map(item => item.recordKey).sort().join('|'), duplicateStatistic: String(rows.length), uniqueStatistic: '1', reason: 'Duplicate source identity or multiple assignment requires owner review.' }))
  }
  for (const item of baseline.evidenceDiscrepancies) results.push(makeResult({ classification: 'evidence_discrepancy', recordKind: 'evidence-discrepancy', recordKey: item.discrepancyId, sourceCountDomain: `narrative:${item.narrativeCount}`, productionCountDomain: `manifest:${item.manifestCount}`, evidenceReference: item.evidenceReference, reason: 'The Phase 9 narrative count and authoritative manifest count remain unresolved.', decisionBoundary: 'owner-and-authorized-production-evidence-required' }))
  for (const item of inventory.contentRecords.filter(item => item.publicationState === 'unknown' || item.visibility === 'unknown')) results.push(makeResult({ classification: 'requires_owner_review', recordKind: 'content', recordKey: `${item.recordKey}:unknown-classification`, sourceIdentity: item.sourceIdentity, productionCountDomain: 'production_content', evidenceReference: 'sanitized-inventory:contentRecords', reason: 'Unknown publication or visibility classification cannot be approved automatically.' }))
  return results.sort((a, b) => `${a.classification}|${a.recordKind}|${a.recordKey}|${a.reconciliationId}`.localeCompare(`${b.classification}|${b.recordKind}|${b.recordKey}|${b.reconciliationId}`))
}

export const reconcileFailClosed = async (baseline, inventory) => {
  try { return await reconcileInventory(baseline, inventory) }
  catch (error) {
    const sensitive = /sensitive|secret|token|cookie|password|database URL/i.test(error.message)
    return [makeResult({ classification: sensitive ? 'blocked_sensitive_data' : 'invalid_input', recordKind: 'input', recordKey: 'rejected-input', reason: error.message, decisionBoundary: 'blocked-no-network-no-comparison' })]
  }
}

export const runReconcileCli = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv)
  const baselinePath = resolveRepositoryLocalPath(args.baseline, '--baseline', { mustBeJson: true })
  const inventoryPath = resolveRepositoryLocalPath(args.inventory, '--inventory', { mustBeJson: true })
  const outputPath = resolveRepositoryLocalPath(args.output, '--output')
  const [baseline, inventory] = await Promise.all([JSON.parse(await (await import('node:fs/promises')).readFile(baselinePath, 'utf8')), JSON.parse(await (await import('node:fs/promises')).readFile(inventoryPath, 'utf8'))])
  assertNoSensitiveMaterial(inventory, 'Inventory')
  assertNoUrlValues(inventory, 'Inventory')
  const results = await reconcileInventory(baseline, inventory)
  await writeText(outputPath, toCsv(reconciliationColumns, results))
  return { status: 'ok', classifications: Object.fromEntries([...new Set(results.map(item => item.classification))].sort().map(value => [value, results.filter(item => item.classification === value).length])), rows: results.length }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/reconcile-inventory.mjs')) {
  try { console.log(JSON.stringify(await runReconcileCli(), null, 2)) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
