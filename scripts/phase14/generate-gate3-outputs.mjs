import {
  assertNoSensitiveMaterial, assertNoUrlValues, fileSha256, readCsv, readJson, readText, sha256, toCsv, writeJson, writeText
} from './lib.mjs'
import { humanColumns as ownerHumanColumns, ownerReviewColumns } from './owner-review.mjs'
import {
  assertNoOwnerIdentityFabrication, buildDiscrepancyPackage, exceptionColumns, exceptionHumanColumns,
  generateExceptionRows, generateProductionOnlyRows, productionOnlyColumns, productionOnlyHumanColumns,
  productionOnlySummary, validateExceptionRows, validateProductionOnlyRows
} from './gate3-review-packages.mjs'
import { ownerReviewStatus, ownerReviewSummaryMarkdown } from './gate3-owner-status.mjs'
import {
  adminUatColumns, adminUatEvidenceIndexMarkdown, adminUatHumanColumns, adminUatStatus,
  adminUatStatusMarkdown, generateAdminUatRows, validateAdminUatRows
} from './gate3-admin-uat.mjs'

const paths = {
  reconciliation: '.private/phase14-production-export/reconciliation.csv',
  inventory: '.private/phase14-production-export/normalized.v1.json',
  countDomains: '.private/phase14-production-export/count-domain-reconciliation.json',
  gate2Status: 'outputs/phase-14-gate2-readonly-status.json',
  phase13Assets: 'outputs/phase-13-asset-classification.json',
  sourceInventory: 'migration/phase9/source-inventory.jsonl',
  ownerWorking: 'outputs/phase-14-owner-review-working.csv',
  productionOnlyCsv: 'outputs/phase-14-production-only-disposition.csv',
  productionOnlyMarkdown: 'outputs/phase-14-production-only-disposition.md',
  exceptionsCsv: 'outputs/phase-14-owner-review-exceptions.csv',
  exceptionsMarkdown: 'outputs/phase-14-owner-review-exceptions.md',
  ownerStatus: 'outputs/phase-14-owner-review-status.json',
  ownerSummary: 'outputs/phase-14-owner-review-summary.md',
  discrepancy: 'outputs/phase-14-evidence-discrepancy-decision-package.md',
  uatCsv: 'outputs/phase-14-admin-uat-execution.csv',
  uatStatus: 'outputs/phase-14-admin-uat-execution-status.md',
  uatIndex: 'outputs/phase-14-admin-uat-evidence-index.md',
  overallStatus: 'outputs/phase-14-gate3-status.json',
  report: 'outputs/phase-14-gate3-preparation-report.md',
  executionStatus: 'outputs/phase-14-execution-status.md',
  gitBaseline: 'outputs/phase-14-gate3-git-baseline-evidence.json'
}

const blankHuman = (rows, columns) => rows.every(row => columns.every(column => !String(row[column] || '').trim()))
const markdownCell = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
const readCsvIfPresent = path => readCsv(path).catch(() => [])

const productionOnlyMarkdown = (rows, summary) => `# Phase 14 production-only disposition\n\n` +
  `Status: **IN PROGRESS — OWNER HUMAN INPUT REQUIRED**. These ${rows.length} records are sanitized proposals from the owner-authorized Gate 2 read-only export. They are not production mutations and the four human fields remain blank until owner review.\n\n` +
  `| Metric | Count |\n| --- | ---: |\n` +
  `| total production-only records | ${summary.total} |\n` +
  `| proposed expected operational metadata | ${summary.proposedClassifications.expected_operational_metadata} |\n` +
  `| proposed expected system record | ${summary.proposedClassifications.expected_system_record} |\n` +
  `| proposed owner confirmation | ${summary.proposedClassifications.requires_owner_confirmation} |\n` +
  `| final human dispositions recorded | ${summary.finalHumanDispositions} |\n` +
  `| unreviewed | ${summary.unreviewed} |\n\n` +
  `| Stable ID | Domain | Sanitized identity | Proposed classification | Confidence | Human confirmation | Final disposition |\n` +
  `| --- | --- | --- | --- | --- | --- | --- |\n` +
  rows.map(row => `| \`${row.stableId}\` | ${markdownCell(row.domain)} | \`${row.sanitizedIdentity}\` | ${row.proposedClassification} | ${row.automationConfidence} | ${row.humanConfirmationRequired} | ${row.finalHumanDisposition || ''} |`).join('\n') +
  `\n\nThe CSV is authoritative for row-level evidence hashes, references, reasons, cutover impact, and human-input fields. Historical counts are not presented as current production state.\n`

const exceptionsMarkdown = rows => `# Phase 14 owner-review exceptions\n\n` +
  `Status: **IN PROGRESS — OWNER HUMAN INPUT REQUIRED**. Exactly ${rows.length} exceptions require human disposition: eight multiple-assignment source groups and one unknown visibility/system-record classification. Automation supplies options and technical recommendations but does not make an owner decision.\n\n` +
  `| Stable row ID | Canonical relationship ID | Automated classification | Owner decision | Follow-up status | Cutover blocker |\n` +
  `| --- | --- | --- | --- | --- | --- |\n` +
  rows.map(row => `| \`${row.stableRowId}\` | \`${row.canonicalRelationshipId}\` | ${row.currentAutomatedClassification} | ${row.ownerDecision || ''} | ${row.followUpStatus} | ${row.cutoverBlocker} |`).join('\n') +
  `\n\nThe CSV contains the sanitized source/production identities, evidence hashes, automation limit, available options, consequence summary, recommended technical action, and blank human decision fields.\n`

const executionStatusMarkdown = ({ productionSummary, ownerStatus, exceptionRows, uatStatus }) => `# Phase 14 execution status\n\n` +
  `Overall: **IN PROGRESS**\n\n` +
  `Gate 1 repository readiness: **COMPLETE**.\n\n` +
  `Gate 2 owner-authorized production read-only inventory: **COMPLETE**. Historical Gate 2 safety counters remain 331 read-only queries and 5 authenticated sessions; all sessions were closed and no credential was persisted.\n\n` +
  `Gate 3 owner review and administrator UAT: **PREPARATION COMPLETE; HUMAN INPUT REQUIRED**.\n\n` +
  `| Gate 3 workstream | Current state | Pending |\n| --- | --- | ---: |\n` +
  `| 405-row owner review | IN PROGRESS | ${ownerStatus.unreviewed_rows} |\n` +
  `| production-only disposition | IN PROGRESS | ${productionSummary.unreviewed} |\n` +
  `| owner-review exceptions | IN PROGRESS | ${exceptionRows.filter(row => !row.ownerDecision).length} |\n` +
  `| Phase 9 28/27 evidence discrepancy | UNRESOLVED | 1 |\n` +
  `| administrator UAT | NOT EXECUTED | ${uatStatus.unexecuted_cases} |\n\n` +
  `Gate 4 production mutation and cutover: **NOT AUTHORIZED**. No production mutation, publication, redirect activation, DNS/domain change, Wix recrawl, cutover, rollback, merge, or completion tag is permitted by Gate 3 preparation.\n`

const gate3ReportMarkdown = ({ productionSummary, ownerStatus, exceptionRows, uatStatus, evidenceHashes }) => `# Phase 14 Gate 3 preparation report\n\n` +
  `Result: **SUPPORT PACKAGE COMPLETE; GATE 3 IN PROGRESS**. Repository-only tooling converted the ignored, sanitized Gate 2 evidence into redacted human review packages. No production connection was opened in this work.\n\n` +
  `## Gate 3 status\n\n` +
  `| Workstream | Status | Pending IDs |\n| --- | --- | --- |\n` +
  `| Owner review | IN PROGRESS | ${ownerStatus.unreviewed_rows} IDs in \`phase-14-owner-review-status.json.pending_row_ids\` |\n` +
  `| Production-only disposition | IN PROGRESS | ${productionSummary.unreviewed} stable IDs in the disposition CSV/Markdown |\n` +
  `| 9 exception reviews | IN PROGRESS | ${exceptionRows.filter(row => !row.ownerDecision).map(row => `\`${row.stableRowId}\``).join(', ')} |\n` +
  `| 28/27 evidence discrepancy | UNRESOLVED | owner decision, rationale, reviewer, reviewed_at, and evidence confirmation |\n` +
  `| Admin UAT | NOT EXECUTED | ${Array.from({ length: uatStatus.unexecuted_cases }, (_, index) => `\`UAT-${String(index + 1).padStart(2, '0')}\``).join(', ')} |\n` +
  `| Gate 3 overall | IN PROGRESS | owner review and administrator execution |\n\n` +
  `## Count-domain guardrails\n\n` +
  `- \`source_inventory_skip_items = 70\` is historical source-inventory skip evidence.\n` +
  `- \`imported_target_records_draft = 70\` is the current Gate 2 read-only target-record count.\n` +
  `- \`source_assets = 398\` is the historical source inventory row count; there are 397 source-unique assets.\n` +
  `- \`migrated_storage_objects = 378\` is both the historical migration-object domain and the Gate 2 matched production object count.\n` +
  `- No subtraction of 398 and 378 is interpreted as 20 missing assets.\n\n` +
  `## Deterministic evidence hashes\n\n` +
  Object.entries(evidenceHashes).map(([path, hash]) => `- \`${path}\`: \`${hash}\``).join('\n') +
  `\n\nAll owner and administrator identities, decisions, timestamps, results, and evidence hashes remain human-supplied fields. Gate 4 is not authorized.\n`

const main = async () => {
  const [reconciliationRows, inventory, countDomains, gate2Status, phase13Assets, ownerRows, sourceText] = await Promise.all([
    readCsv(paths.reconciliation), readJson(paths.inventory), readJson(paths.countDomains), readJson(paths.gate2Status),
    readJson(paths.phase13Assets), readCsv(paths.ownerWorking), readText(paths.sourceInventory)
  ])

  const privateHashes = await Promise.all([fileSha256(paths.reconciliation), fileSha256(paths.inventory), fileSha256(paths.countDomains)])
  const expectedPrivateHashes = [
    gate2Status.evidenceHashes.reconciliationSha256,
    gate2Status.evidenceHashes.sanitizedInventorySha256,
    gate2Status.evidenceHashes.countDomainReconciliationSha256
  ]
  if (privateHashes.some((value, index) => value !== expectedPrivateHashes[index])) throw new Error('Ignored Gate 2 evidence hash does not match the tracked Gate 2 index.')

  const existingProductionRows = await readCsvIfPresent(paths.productionOnlyCsv)
  const production = generateProductionOnlyRows(reconciliationRows, inventory, existingProductionRows)
  if (production.conflicts.length) throw new Error(`Production-only regeneration has ${production.conflicts.length} human/machine conflict(s).`)
  const productionErrors = validateProductionOnlyRows(production.rows)
  if (productionErrors.length) throw new Error(productionErrors.join('; '))

  const existingExceptionRows = await readCsvIfPresent(paths.exceptionsCsv)
  const exceptions = generateExceptionRows(reconciliationRows, existingExceptionRows)
  if (exceptions.conflicts.length) throw new Error(`Exception regeneration has ${exceptions.conflicts.length} human/machine conflict(s).`)
  const exceptionErrors = validateExceptionRows(exceptions.rows)
  if (exceptionErrors.length) throw new Error(exceptionErrors.join('; '))

  const ownerStatus = ownerReviewStatus(ownerRows, ownerReviewColumns)
  if (ownerRows.length !== 405 || ownerStatus.assigned_relationship_rows !== 378 || ownerStatus.accepted_skip_source_rows !== 27 || ownerStatus.invalid_rows !== 0) {
    throw new Error('The authoritative owner working copy is not the expected valid 405 = 378 + 27 row set.')
  }

  const existingUatRows = await readCsvIfPresent(paths.uatCsv)
  const uat = generateAdminUatRows(existingUatRows)
  if (uat.conflicts.length) throw new Error(`Admin UAT regeneration has ${uat.conflicts.length} human/machine conflict(s).`)
  const uatErrors = validateAdminUatRows(uat.rows)
  if (uatErrors.length) throw new Error(uatErrors.join('; '))
  const uatSummary = adminUatStatus(uat.rows)

  assertNoOwnerIdentityFabrication([...ownerRows, ...production.rows, ...exceptions.rows, ...uat.rows])
  for (const [label, rows] of [['production-only', production.rows], ['exceptions', exceptions.rows], ['owner review', ownerRows], ['admin UAT', uat.rows]]) {
    assertNoSensitiveMaterial(rows, label)
    assertNoUrlValues(rows, label)
  }

  const sourceAssetRows = sourceText.trim().split(/\r?\n/).map(JSON.parse).filter(item => ['image', 'attachment'].includes(item.sourceKind))
  const sourceGroups = new Map()
  for (const item of sourceAssetRows) sourceGroups.set(item.sourceKey, [...(sourceGroups.get(item.sourceKey) || []), item])
  const duplicateGroups = [...sourceGroups.entries()].filter(([, rows]) => rows.length > 1)
  if (sourceAssetRows.length !== 398 || sourceGroups.size !== 397 || duplicateGroups.length !== 1) throw new Error('Source inventory no longer supports the documented 398-row / 397-identity discrepancy explanation.')
  const duplicateSourceHash = duplicateGroups[0][0].replace(/^wix:asset-source:/, '')
  if (!duplicateGroups[0][1].every(item => item.disposition === 'migrate')) throw new Error('The single duplicate source identity is no longer an assigned migrate row.')
  if (phase13Assets.metrics.assigned_unique_source_objects_total !== 370 || phase13Assets.metrics.unassigned_source_assets_total !== 27) throw new Error('Phase 13 asset identity domains changed.')

  const prodSummary = productionOnlySummary(production.rows)
  const discrepancyMarkdown = buildDiscrepancyPackage({
    duplicateSourceHash,
    productionObjectCount: countDomains.currentProductionReadonlyInventory.storage_objects_total,
    assignedUniqueSources: phase13Assets.metrics.assigned_unique_source_objects_total,
    multipleAssignmentGroups: phase13Assets.metrics.same_source_multi_assignment_groups_total
  })

  const textOutputs = new Map([
    [paths.productionOnlyCsv, toCsv(productionOnlyColumns, production.rows)],
    [paths.productionOnlyMarkdown, productionOnlyMarkdown(production.rows, prodSummary)],
    [paths.exceptionsCsv, toCsv(exceptionColumns, exceptions.rows)],
    [paths.exceptionsMarkdown, exceptionsMarkdown(exceptions.rows)],
    [paths.ownerSummary, ownerReviewSummaryMarkdown(ownerStatus)],
    [paths.discrepancy, discrepancyMarkdown],
    [paths.uatCsv, toCsv(adminUatColumns, uat.rows)],
    [paths.uatStatus, adminUatStatusMarkdown(uatSummary, uat.rows)],
    [paths.uatIndex, adminUatEvidenceIndexMarkdown(uat.rows)]
  ])
  textOutputs.set(paths.executionStatus, executionStatusMarkdown({ productionSummary: prodSummary, ownerStatus, exceptionRows: exceptions.rows, uatStatus: uatSummary }))
  const evidenceHashes = Object.fromEntries([...textOutputs].map(([path, value]) => [path, sha256(value)]))
  textOutputs.set(paths.report, gate3ReportMarkdown({ productionSummary: prodSummary, ownerStatus, exceptionRows: exceptions.rows, uatStatus: uatSummary, evidenceHashes }))

  for (const [path, value] of textOutputs) await writeText(path, value)
  await writeJson(paths.ownerStatus, ownerStatus)
  await writeJson(paths.gitBaseline, {
    schemaVersion: 1,
    branch: 'codex/phase14-prelaunch-verification-uat-cutover-prep',
    phase13Baseline: '598882e371a01c832832d7141acec918143c133c',
    gate1Commit: '57133e1a97818b4c80175ff1d733a3143c156a3c',
    gate2Commit: '7623f36b3074fe38794d4a5096b8b1d075345e93',
    mainAtPreparationStart: '598882e371a01c832832d7141acec918143c133c',
    remoteBranchAtPreparationStart: '7623f36b3074fe38794d4a5096b8b1d075345e93',
    pullRequest: 19,
    pullRequestStateAtPreparationStart: 'OPEN_DRAFT_NOT_MERGED'
  })

  const statusEvidenceHashes = Object.fromEntries(await Promise.all(
    [...textOutputs.keys(), paths.ownerStatus, paths.gitBaseline].map(async path => [path, await fileSha256(path)])
  ))
  const overallStatus = {
    schemaVersion: 1,
    phase: 14,
    overall: 'IN_PROGRESS',
    gate3: {
      ownerReview: ownerStatus.status,
      productionOnlyDisposition: prodSummary.unreviewed === 0 ? 'HUMAN_DISPOSITIONS_RECORDED_VALIDATION_PENDING' : 'IN_PROGRESS_HUMAN_INPUT_REQUIRED',
      ownerReviewExceptions: exceptions.rows.every(row => row.ownerDecision) ? 'HUMAN_DECISIONS_RECORDED_VALIDATION_PENDING' : 'IN_PROGRESS_HUMAN_INPUT_REQUIRED',
      evidenceDiscrepancy: 'UNRESOLVED',
      adminUat: uatSummary.unexecuted_cases === 0 ? 'HUMAN_RESULTS_RECORDED_VALIDATION_PENDING' : 'NOT_EXECUTED_HUMAN_INPUT_REQUIRED'
    },
    counts: {
      ownerReviewRows: ownerRows.length,
      ownerReviewUnreviewed: ownerStatus.unreviewed_rows,
      productionOnlyRows: production.rows.length,
      productionOnlyUnreviewed: prodSummary.unreviewed,
      exceptionRows: exceptions.rows.length,
      exceptionUnreviewed: exceptions.rows.filter(row => !row.ownerDecision).length,
      evidenceDiscrepancies: 1,
      adminUatCases: uatSummary.total_cases,
      adminUatUnexecuted: uatSummary.unexecuted_cases
    },
    countDomains: {
      source_inventory_skip_items: 70,
      imported_target_records_draft: 70,
      source_assets: 398,
      source_unique_assets_total: 397,
      migrated_storage_objects: 378,
      accepted_skip_unique_sources: 27
    },
    gate2HistoricalSafetyReference: { productionQueries: 331, productionAuthenticatedSessions: 5 },
    gate3Safety: {
      newProductionQueries: 0,
      newProductionAuthenticatedSessions: 0,
      productionMutations: 0,
      assetDownloads: 0,
      signedUrlsCreated: 0,
      liveWixRecrawls: 0,
      redirectActivations: 0,
      cutoverActions: 0,
      ownerSignaturesCreatedByAutomation: 0,
      adminUatExecutionsClaimedByAutomation: 0,
      trackedPrivateFiles: 0,
      secretFindings: 0
    },
    evidenceHashes: statusEvidenceHashes,
    productionStateClaimBoundary: 'Only the owner-authorized Gate 2 read-only inventory is described as current; historical repository counts remain labeled historical.',
    decisionBoundary: 'OWNER_REVIEW_AND_ADMIN_UAT_HUMAN_INPUT_REQUIRED',
    stopPoint: 'PHASE_14_OWNER_REVIEW_OR_ADMIN_UAT_HUMAN_INPUT'
  }
  assertNoSensitiveMaterial(overallStatus, 'Gate 3 status')
  assertNoUrlValues(overallStatus, 'Gate 3 status')
  await writeJson(paths.overallStatus, overallStatus)

  if (!blankHuman(production.rows, productionOnlyHumanColumns) || !blankHuman(exceptions.rows, exceptionHumanColumns) ||
      !blankHuman(ownerRows, ownerHumanColumns) || !blankHuman(uat.rows, adminUatHumanColumns)) {
    console.log(JSON.stringify({ status: 'preserved-human-input', outputs: Object.keys(statusEvidenceHashes).length + 1 }, null, 2))
  } else console.log(JSON.stringify({ status: 'prepared-human-input-required', outputs: Object.keys(statusEvidenceHashes).length + 1 }, null, 2))
}

try { await main() }
catch (error) { console.error(error.message); process.exitCode = 1 }
