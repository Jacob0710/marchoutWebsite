import { prettyJson, readCsv, readJson, readText, sha256, toCsv, writeJson, writeText } from './lib.mjs'
import { normalizeProductionInventory } from './normalize-production-inventory.mjs'
import { generateOwnerReviewRows, ownerReviewColumns, validateOwnerReviewRows } from './owner-review.mjs'
import { reconcileInventory, reconciliationColumns } from './reconcile-inventory.mjs'

const evidencePaths = [
  'outputs/phase-13-completion-report.md',
  'outputs/phase-13-offline-baseline.json',
  'outputs/phase-13-evidence-index.md',
  'outputs/phase-13-asset-gap-report.md',
  'outputs/phase-13-asset-classification.csv',
  'docs/prelaunch-content-asset-verification.md',
  'schemas/phase13/source-item.schema.json',
  'schemas/phase13/asset.schema.json',
  'schemas/phase13/inventory-summary.schema.json',
  'schemas/phase13/production-export.schema.json',
  'schemas/phase14/production-inventory-export.v1.schema.json',
  'schemas/phase14/production-readonly-authorization.v1.schema.json',
  'fixtures/phase14/production-inventory.sample.v1.json',
  'fixtures/phase14/reconciliation-baseline.sample.v1.json',
  'docs/phase14-production-readonly-inventory-runbook.md',
  'docs/phase14-owner-review-runbook.md',
  'docs/phase14-admin-uat-plan.md',
  'docs/phase14-admin-uat-checklist.md',
  'docs/phase14-wix-cutover-decision.md',
  'docs/phase14-redirect-activation-plan.md',
  'docs/phase14-cutover-runbook.md',
  'docs/phase14-rollback-runbook.md'
]

export const readiness = {
  schemaVersion: 1,
  phase: 14,
  overall: 'IN_PROGRESS',
  gates: {
    gate1: 'COMPLETE',
    gate2ProductionReadonlyInventory: 'READY_AUTHORIZATION_REQUIRED',
    gate3OwnerReviewAndAdminUat: 'PREPARED_HUMAN_EXECUTION_REQUIRED',
    gate4CutoverAndProductionMutation: 'NOT_AUTHORIZED'
  },
  baseline: {
    phase13MergeCommit: '598882e371a01c832832d7141acec918143c133c',
    phase13Tag: 'phase-13-content-asset-reconciliation-prep-complete',
    phase13TagObject: '2ed33151596e5605059771283f00700a1d2b62eb',
    phase13TagPeeledCommit: '598882e371a01c832832d7141acec918143c133c'
  },
  historicalCountDomains: {
    source_inventory_skip_items: 70,
    imported_target_records_draft: 70,
    source_assets: 398,
    source_unique_assets_total: 397,
    migrated_storage_objects: 378,
    storage_assignments_total: 378,
    owner_references_total: 378,
    publication_reviews_total: 122,
    redirects_accepted_out_of_scope_total: 52,
    assigned_unique_sources: 370,
    accepted_skip_or_unassigned_unique_sources: 27,
    multiple_assignment_groups: 8,
    canonical_relationships: 405,
    currentProductionStateClaimed: false
  },
  metrics: {
    productionQueries: 0,
    productionAuthenticatedSessions: 0,
    productionMutations: 0,
    liveWixRecrawls: 0,
    networkPathsUsedForProduction: 0,
    secretFindings: 0,
    ownerSignaturesCreatedByAutomation: 0,
    adminUatExecutionsClaimed: 0,
    cutoverActions: 0
  },
  stopPoint: 'PHASE_14_PRODUCTION_READONLY_AUTHORIZATION_GATE'
}

const buildEvidenceIndex = async () => {
  const entries = await Promise.all(evidencePaths.map(async path => {
    const text = (await readText(path)).replace(/\r\n/g, '\n')
    return { path, bytes: Buffer.byteLength(text), sha256: sha256(text) }
  }))
  entries.sort((a, b) => a.path.localeCompare(b.path))
  const lines = [
    '# Phase 14 Gate 1 evidence index', '',
    'This index covers repository and synthetic fixture evidence only. It is not a production inventory.', '',
    `- entries: ${entries.length}`, '- production evidence entries: 0', '- secret findings: 0', '',
    '| Path | Bytes | SHA-256 |', '| --- | ---: | --- |',
    ...entries.map(item => `| \`${item.path}\` | ${item.bytes} | \`${item.sha256}\` |`), ''
  ]
  return lines.join('\n')
}

export const generateGate1Outputs = async () => {
  const [inventoryInput, baseline, sourceRows] = await Promise.all([
    readJson('fixtures/phase14/production-inventory.sample.v1.json'),
    readJson('fixtures/phase14/reconciliation-baseline.sample.v1.json'),
    readCsv('outputs/phase-13-asset-classification.csv')
  ])
  const inventory = await normalizeProductionInventory(inventoryInput)
  const reconciliation = await reconcileInventory(baseline, inventory)
  const owner = generateOwnerReviewRows(sourceRows)
  const ownerErrors = validateOwnerReviewRows(owner.rows)
  if (owner.conflicts.length || ownerErrors.length) throw new Error(`Gate 1 owner review generation failed: ${[...owner.conflicts.map(item => item.reason), ...ownerErrors].join('; ')}`)
  await writeJson('outputs/phase-14-readiness-status.json', readiness)
  await writeJson('outputs/phase-14-production-inventory-dry-run.json', inventory)
  await writeText('outputs/phase-14-reconciliation-dry-run.csv', toCsv(reconciliationColumns, reconciliation))
  await writeText('outputs/phase-14-owner-review-working.csv', toCsv(ownerReviewColumns, owner.rows))
  await writeText('outputs/phase-14-evidence-index.md', await buildEvidenceIndex())
  return {
    status: 'ok', fixtureRecords: inventory.contentRecords.length + inventory.storageObjects.length + inventory.relationships.length,
    reconciliationRows: reconciliation.length, ownerReviewRows: owner.rows.length,
    outputIdentity: sha256(prettyJson(readiness))
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/generate-gate1-outputs.mjs')) console.log(JSON.stringify(await generateGate1Outputs(), null, 2))
