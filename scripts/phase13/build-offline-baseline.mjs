import { assetReviewCsv, normalizeAssetInventory } from './normalize-asset-inventory.mjs'
import { normalizeSourceInventory } from './normalize-source-inventory.mjs'
import { assertNoSensitiveMaterial, countBy, fileSha256, prettyJson, readCsv, readJson, readJsonl, sha256, sortUnique, writeJson, writeText } from './lib.mjs'
import { validateNamedSchema } from './validate-phase13-schemas.mjs'

const evidencePaths = [
  'migration/phase9/source-inventory.jsonl',
  'migration/phase9/content-manifest.jsonl',
  'migration/phase9/assets-manifest.jsonl',
  'migration/phase9/manual-review.csv',
  'migration/phase9/url-redirects.csv',
  'migration/phase9/source-snapshot.json',
  'migration/phase10/editorial-decisions.json',
  'migration/phase10/redirect-decisions.json'
]

const count = (value, domain, evidence) => ({ value, domain, evidence, historicalOnly: true })
const countMap = (values, domain, evidence) => ({ values, domain, evidence, historicalOnly: true })

export const buildOfflineBaseline = async () => {
  const [sourceRows, contentRows, assetRows, reviewRows, redirectRows, snapshot, editorialDecisions] = await Promise.all([
    readJsonl('migration/phase9/source-inventory.jsonl'),
    readJsonl('migration/phase9/content-manifest.jsonl'),
    readJsonl('migration/phase9/assets-manifest.jsonl'),
    readCsv('migration/phase9/manual-review.csv'),
    readCsv('migration/phase9/url-redirects.csv'),
    readJson('migration/phase9/source-snapshot.json'),
    readJson('migration/phase10/editorial-decisions.json')
  ])
  const generatedFrom = await Promise.all(evidencePaths.map(async path => ({ path, sha256: await fileSha256(path) })))
  const source = normalizeSourceInventory({ sourceRows, contentRows, assetRows, reviewRows })
  const assets = normalizeAssetInventory({ sourceRows, contentRows, assetRows, reviewRows })
  const importedTargets = contentRows.filter(item => item.operation === 'create' && item.desiredStatus === 'draft')
  const acceptedRedirects = redirectRows.filter(item => Number(item.status_code) === 0 && item.target_path)
  const unassignedSourceAssets = assets.metrics.unassigned_source_assets_total
  const unresolvedRelationships = [
    {
      relationship: 'source_inventory_skip_items_to_imported_target_records_draft',
      count: 1,
      status: 'unresolved',
      reason: 'The equal historical value 70 does not establish row identity or a one-to-one relationship between the two count domains.',
      phase14Checkpoint: 'Compare owner-authorized sanitized production exports and review source skip items independently.'
    },
    {
      relationship: 'accepted_skip_source_asset_to_owner_or_storage_assignment',
      count: unassignedSourceAssets,
      status: 'unresolved',
      reason: 'Phase 9 records these source assets as intentionally unassigned Wix chrome/background/decorative objects; Phase 13 does not infer an owner or production object.',
      phase14Checkpoint: 'Owner confirms each accepted-skip asset before Wix cutover using the repository review CSV and read-only production export.'
    }
  ]
  const comparisonRecords = [
    ...importedTargets.map(item => ({
      recordKind: 'target-record',
      key: item.migrationKey,
      fingerprint: sha256({ targetKind: item.targetKind, status: item.desiredStatus, sourceHash: item.sourceHash, normalizedHash: item.normalizedHash })
    })),
    ...assetRows.map(item => ({
      recordKind: 'storage-assignment',
      key: item.assetKey,
      fingerprint: sha256({ sourceSha256: item.sourceSha256, ownerKind: item.ownerKind, ownerMigrationKey: item.ownerMigrationKey, role: item.role, targetBucket: item.targetBucket })
    }))
  ].sort((a, b) => `${a.recordKind}:${a.key}`.localeCompare(`${b.recordKind}:${b.key}`))

  const baseline = {
    schemaVersion: 1,
    generatedFrom,
    historicalBaselines: {
      evidenceAsOf: '2026-07-22',
      currentProductionStateClaimed: false,
      sourceSnapshotSha256: snapshot.snapshotSha256
    },
    countDomains: {
      source_inventory_items_total: count(sourceRows.length, 'source inventory rows', 'migration/phase9/source-inventory.jsonl'),
      source_inventory_items_by_historical_disposition: countMap(countBy(sourceRows, 'disposition'), 'source inventory disposition', 'migration/phase9/source-inventory.jsonl'),
      source_inventory_skip_items: count(sourceRows.filter(item => item.disposition === 'skip').length, 'source_items.disposition=skip', 'migration/phase9/source-inventory.jsonl'),
      imported_target_records_total: count(importedTargets.length, 'imported_targets.operation=create', 'migration/phase9/content-manifest.jsonl'),
      imported_target_records_by_module: countMap(countBy(importedTargets, 'targetKind'), 'imported target module', 'migration/phase9/content-manifest.jsonl'),
      imported_target_records_draft: count(importedTargets.filter(item => item.desiredStatus === 'draft').length, 'imported_targets.status=draft', 'migration/phase9/content-manifest.jsonl'),
      source_assets: count(sourceRows.filter(item => ['image', 'attachment'].includes(item.sourceKind)).length, 'Wix/source asset inventory rows', 'migration/phase9/source-inventory.jsonl'),
      source_unique_assets_total: count(assets.metrics.source_unique_assets_total, 'unique source asset keys', 'migration/phase9/source-inventory.jsonl'),
      storage_assignments_total: count(assetRows.length, 'storage assignment manifest rows', 'migration/phase9/assets-manifest.jsonl'),
      migrated_storage_objects: count(assetRows.length, 'historical migrated private Storage object assignments', 'migration/phase9/assets-manifest.jsonl'),
      owner_references_total: count(assets.metrics.owner_references_total, 'asset assignment owner references', 'migration/phase9/assets-manifest.jsonl'),
      publication_reviews_total: count(reviewRows.length, 'publication review rows', 'migration/phase9/manual-review.csv'),
      redirects_accepted_out_of_scope_total: count(acceptedRedirects.length, 'redirects.accepted_out_of_scope', 'migration/phase9/url-redirects.csv and owner DECISION-P13-002'),
      unresolved_relationships_total: count(unresolvedRelationships.reduce((sum, item) => sum + item.count, 0), 'explicit unresolved cross-domain or owner relationships', 'Phase 13 derived reconciliation'),
      missing_evidence_total: count(0, 'canonical records missing repository source evidence', 'Phase 13 schema validation and evidence index')
    },
    unresolvedRelationships,
    acceptedOutOfScope: [{
      decision: 'legacy_redirect_activation',
      count: acceptedRedirects.length,
      status: 'accepted_out_of_scope',
      reason: 'Repository owner decided the 52 draft-target legacy redirects will not be implemented.'
    }],
    warnings: sortUnique([
      'All values are historical repository evidence baselines as of 2026-07-22; they are not current production truth.',
      'source_inventory_skip_items = 70 and imported_target_records_draft = 70 are separate count domains with an unresolved relationship.',
      'source_assets = 398 and migrated_storage_objects = 378 are separate count domains; subtraction does not establish missing assets.',
      `The asset manifest has ${assets.metrics.storage_assignments_total} assignments from ${assets.metrics.assigned_unique_source_objects_total} assigned unique source objects; ${assets.metrics.unassigned_source_assets_total} source-unique assets have accepted-skip evidence and ${assets.metrics.same_source_multi_assignment_groups_total} sources have multiple assignments.`,
      'The Phase 9 narrative report says 28 unassigned objects, but authoritative manifests resolve to 398 inventory rows, 397 unique source keys, 371 migrate rows, 370 assigned unique source keys, and 27 skip/unassigned unique source keys. Phase 13 records the discrepancy instead of overwriting the manifests.',
      `Phase 10 conservative decisions retain ${editorialDecisions.summary.keepDraft} imported targets as private drafts.`
    ]),
    comparisonRecords
  }

  for (const record of source.records) {
    const validation = await validateNamedSchema('source-item', record)
    if (!validation.valid) throw new Error(`Invalid source item ${record.sourceItemKey}: ${validation.errors.join('; ')}`)
  }
  for (const record of assets.records) {
    const validation = await validateNamedSchema('asset', record)
    if (!validation.valid) throw new Error(`Invalid asset ${record.assetKey}: ${validation.errors.join('; ')}`)
  }
  const baselineValidation = await validateNamedSchema('inventory-summary', baseline)
  if (!baselineValidation.valid) throw new Error(`Invalid offline baseline: ${baselineValidation.errors.join('; ')}`)
  assertNoSensitiveMaterial({ sourceRecords: source.records, assetRecords: assets.records, baseline }, 'Phase 13 normalized output')

  const normalizedSourceOutput = { schemaVersion: 1, historicalOnly: true, generatedFrom, records: source.records }
  const assetOutput = { schemaVersion: 1, historicalOnly: true, generatedFrom, metrics: assets.metrics, records: assets.records }
  const gapReport = `# Phase 13 asset gap report\n\n` +
    `> Historical repository evidence only. This report is not a current production inventory.\n\n` +
    `## Count domains\n\n` +
    `- source_assets = ${assets.metrics.source_assets}\n` +
    `- source_unique_assets_total = ${assets.metrics.source_unique_assets_total}\n` +
    `- migrated_storage_objects = ${assets.metrics.migrated_storage_objects}\n` +
    `- storage_assignments_total = ${assets.metrics.storage_assignments_total}\n` +
    `- assigned_unique_source_objects_total = ${assets.metrics.assigned_unique_source_objects_total}\n` +
    `- owner_references_total = ${assets.metrics.owner_references_total}\n` +
    `- canonical_asset_relationship_records_total = ${assets.metrics.canonical_asset_relationship_records_total}\n\n` +
    `The 398 source asset inventory rows, 397 source-unique keys, and 378 migrated Storage objects are different domains. The manifest has 378 assignments from 370 unique assigned sources, while 27 source-unique assets carry explicit accepted-skip evidence. One assigned source key appears twice in source inventory under distinct URLs, and eight source keys have more than one assignment. The Phase 9 narrative's arithmetic claim of 28 unassigned objects is retained as a documented report discrepancy, not substituted for authoritative manifest parsing. Therefore no "20 missing assets" claim is valid.\n\n` +
    `## Classification\n\n` +
    `- source asset inventory-row kinds: ${prettyJson(assets.metrics.source_asset_inventory_kind_counts).trim()}\n` +
    `- source unique asset kinds: ${prettyJson(assets.metrics.source_unique_asset_kind_counts).trim()}\n` +
    `- relationship roles: ${prettyJson(assets.metrics.role_counts_by_relationship_record).trim()}\n` +
    `- relationship owner kinds: ${prettyJson(assets.metrics.owner_kind_counts_by_relationship_record).trim()}\n` +
    `- relationship records with source hash: ${assets.metrics.source_hash_present_relationship_records_total}\n` +
    `- relationship records with target bucket evidence: ${assets.metrics.target_bucket_present_relationship_records_total}\n` +
    `- relationship records with target database reference evidence: ${assets.metrics.target_database_reference_present_relationship_records_total}\n\n` +
    `## Phase 14 checkpoints\n\n` +
    `- Owner reviews all ${assets.metrics.unassigned_source_assets_total} accepted-skip source assets and confirms decoration, utility, duplicate, or retained-content disposition.\n` +
    `- Owner confirms every draft target and private asset against an authorized read-only sanitized production export.\n` +
    `- Empty CSV fields \`reviewDecision\`, \`ownerComment\`, \`verifiedAt\`, and \`verifiedBy\` remain unsigned in Phase 13.\n` +
    `- Wix remains available until owner acceptance and a later cutover decision.\n`

  await Promise.all([
    writeJson('outputs/phase-13-normalized-source-items.json', normalizedSourceOutput),
    writeJson('outputs/phase-13-asset-classification.json', assetOutput),
    writeText('outputs/phase-13-asset-classification.csv', assetReviewCsv(assets.records)),
    writeText('outputs/phase-13-asset-gap-report.md', gapReport),
    writeJson('outputs/phase-13-offline-baseline.json', baseline)
  ])
  return {
    baseline,
    sourceMetrics: source.metrics,
    assetMetrics: assets.metrics,
    outputHashes: {
      normalizedSource: sha256(prettyJson(normalizedSourceOutput)),
      assetClassification: sha256(prettyJson(assetOutput)),
      assetReviewCsv: sha256(assetReviewCsv(assets.records)),
      assetGapReport: sha256(gapReport),
      offlineBaseline: sha256(prettyJson(baseline))
    }
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/build-offline-baseline.mjs')) {
  const result = await buildOfflineBaseline()
  console.log(JSON.stringify({ status: 'ok', countDomains: Object.fromEntries(Object.entries(result.baseline.countDomains).map(([key, value]) => [key, value.value ?? value.values])), assetMetrics: result.assetMetrics, outputHashes: result.outputHashes }, null, 2))
}
