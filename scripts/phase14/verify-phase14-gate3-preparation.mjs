import { access } from 'node:fs/promises'
import {
  assertNoSensitiveMaterial, assertNoUrlValues, fileSha256, fileSize, git, readCsv, readJson, readText, sha256, stableJson
} from './lib.mjs'
import { humanColumns as ownerHumanColumns, ownerReviewColumns, validateOwnerReviewRows } from './owner-review.mjs'
import {
  assertNoOwnerIdentityFabrication, exceptionColumns, exceptionHumanColumns, productionOnlyColumns,
  productionOnlyHumanColumns, validateExceptionRows, validateProductionOnlyRows
} from './gate3-review-packages.mjs'
import { ownerReviewStatus } from './gate3-owner-status.mjs'
import { adminUatColumns, adminUatHumanColumns, adminUatStatus, validateAdminUatRows } from './gate3-admin-uat.mjs'

const assert = (condition, message) => { if (!condition) throw new Error(message) }
const blank = (rows, columns) => rows.every(row => columns.every(column => !String(row[column] || '').trim()))
const exactHeader = async (path, columns) => assert((await readText(path)).split(/\r?\n/, 1)[0] === columns.join(','), `${path} header changed.`)

const requiredOutputs = [
  'outputs/phase-14-production-only-disposition.csv',
  'outputs/phase-14-production-only-disposition.md',
  'outputs/phase-14-owner-review-exceptions.csv',
  'outputs/phase-14-owner-review-exceptions.md',
  'outputs/phase-14-owner-review-summary.md',
  'outputs/phase-14-owner-review-status.json',
  'outputs/phase-14-evidence-discrepancy-decision-package.md',
  'outputs/phase-14-admin-uat-execution.csv',
  'outputs/phase-14-admin-uat-execution-status.md',
  'outputs/phase-14-admin-uat-evidence-index.md',
  'outputs/phase-14-gate3-preparation-report.md',
  'outputs/phase-14-gate3-git-baseline-evidence.json',
  'outputs/phase-14-gate3-status.json',
  'outputs/phase-14-execution-status.md'
]

const main = async () => {
  const [productionRows, exceptionRows, ownerRows, uatRows, ownerStatusOutput, status, discrepancy, report, executionStatus, baseline] = await Promise.all([
    readCsv(requiredOutputs[0]), readCsv(requiredOutputs[2]), readCsv('outputs/phase-14-owner-review-working.csv'),
    readCsv(requiredOutputs[7]), readJson(requiredOutputs[5]), readJson(requiredOutputs[12]), readText(requiredOutputs[6]),
    readText(requiredOutputs[10]), readText(requiredOutputs[13]), readJson(requiredOutputs[11])
  ])

  await Promise.all([
    exactHeader(requiredOutputs[0], productionOnlyColumns),
    exactHeader(requiredOutputs[2], exceptionColumns),
    exactHeader('outputs/phase-14-owner-review-working.csv', ownerReviewColumns),
    exactHeader(requiredOutputs[7], adminUatColumns)
  ])

  const productionErrors = validateProductionOnlyRows(productionRows)
  const exceptionErrors = validateExceptionRows(exceptionRows)
  const ownerErrors = validateOwnerReviewRows(ownerRows)
  const uatErrors = validateAdminUatRows(uatRows)
  assert(productionErrors.length === 0, productionErrors.join('; '))
  assert(exceptionErrors.length === 0, exceptionErrors.join('; '))
  assert(ownerErrors.length === 0, ownerErrors.join('; '))
  assert(uatErrors.length === 0, uatErrors.join('; '))

  assert(blank(productionRows, productionOnlyHumanColumns), 'Production-only human fields must remain blank in the Gate 3 preparation commit.')
  assert(blank(exceptionRows, exceptionHumanColumns), 'Exception owner fields must remain blank in the Gate 3 preparation commit.')
  assert(blank(ownerRows, ownerHumanColumns), 'The 405-row owner working copy contains an automated or premature human value.')
  assert(blank(uatRows, adminUatHumanColumns), 'Admin UAT human execution fields must remain blank in the Gate 3 preparation commit.')
  assertNoOwnerIdentityFabrication([...productionRows, ...exceptionRows, ...ownerRows, ...uatRows])

  assert(productionRows.filter(row => row.domain === 'editorial-target').length === 70, 'Expected 70 editorial-target production-only rows.')
  assert(productionRows.filter(row => row.domain === 'editorial-redirect').length === 83, 'Expected 83 editorial-redirect production-only rows.')
  assert(productionRows.filter(row => row.domain === 'activity').length === 4, 'Expected 4 Activity production-only rows.')
  assert(productionRows.filter(row => row.domain === 'site-settings').length === 1, 'Expected 1 site-settings production-only row.')
  assert(productionRows.filter(row => row.proposedClassification === 'expected_operational_metadata').length === 70, 'Expected 70 operational-metadata proposals.')
  assert(productionRows.filter(row => row.proposedClassification === 'expected_system_record').length === 84, 'Expected 84 system-record proposals.')
  assert(productionRows.filter(row => row.proposedClassification === 'requires_owner_confirmation').length === 4, 'Expected 4 owner-confirmation proposals.')
  assert(exceptionRows.filter(row => row.currentAutomatedClassification === 'multiple_assignment_group').length === 8, 'Expected 8 multiple-assignment exceptions.')
  assert(exceptionRows.filter(row => row.currentAutomatedClassification === 'unknown_visibility_classification').length === 1, 'Expected 1 unknown-visibility exception.')

  const recomputedOwnerStatus = ownerReviewStatus(ownerRows, ownerReviewColumns)
  assert(stableJson(ownerStatusOutput) === stableJson(recomputedOwnerStatus), 'Owner review status is not a canonical recomputation of the 405-row CSV.')
  assert(ownerStatusOutput.total_rows === 405 && ownerStatusOutput.assigned_relationship_rows === 378 && ownerStatusOutput.accepted_skip_source_rows === 27, 'Owner review row domains changed.')
  assert(ownerStatusOutput.unreviewed_rows === 405 && ownerStatusOutput.approved_rows === 0 && ownerStatusOutput.archive_rows === 0, 'Automation must not mark owner decisions.')
  assert(ownerStatusOutput.pending_row_ids.length === 405 && new Set(ownerStatusOutput.pending_row_ids).size === 405, 'Owner pending row ID list must contain 405 unique IDs.')

  const uatSummary = adminUatStatus(uatRows)
  assert(uatSummary.total_cases === 23 && uatSummary.unexecuted_cases === 23 && uatSummary.human_executed_cases === 0, 'Automation must not claim administrator UAT execution.')
  assert(discrepancy.includes('Status: **UNRESOLVED**') && discrepancy.includes('398 asset rows but 397 source-unique identities'), 'The 28/27 discrepancy package lacks its unresolved count-domain explanation.')
  assert(discrepancy.includes('398 - 370 = 28') && discrepancy.includes('397 - 370 = 27') && discrepancy.includes('869e8b6837b13c7c75aaf9a8bc4ce473535979e45f529bfe6aad7e8217b02208'), 'The discrepancy evidence identity/arithmetic changed.')
  assert(discrepancy.includes('| final decision |  |') && discrepancy.includes('| reviewer |  |') && discrepancy.includes('| reviewed_at |  |'), 'The discrepancy package must retain blank human decision fields.')

  assert(status.overall === 'IN_PROGRESS' && status.gate3.evidenceDiscrepancy === 'UNRESOLVED', 'Gate 3 must remain IN PROGRESS with the discrepancy unresolved.')
  assert(JSON.stringify(status.counts) === JSON.stringify({
    adminUatCases: 23, adminUatUnexecuted: 23, evidenceDiscrepancies: 1, exceptionRows: 9, exceptionUnreviewed: 9,
    ownerReviewRows: 405, ownerReviewUnreviewed: 405, productionOnlyRows: 158, productionOnlyUnreviewed: 158
  }), 'Gate 3 status counts changed.')
  assert(JSON.stringify(status.countDomains) === JSON.stringify({
    accepted_skip_unique_sources: 27, imported_target_records_draft: 70, migrated_storage_objects: 378,
    source_assets: 398, source_inventory_skip_items: 70, source_unique_assets_total: 397
  }), 'Gate 3 count domains changed or were conflated.')
  assert(Object.values(status.gate3Safety).every(value => value === 0), 'A Gate 3 prohibited safety counter is non-zero.')
  assert(status.decisionBoundary === 'OWNER_REVIEW_AND_ADMIN_UAT_HUMAN_INPUT_REQUIRED' && status.stopPoint === 'PHASE_14_OWNER_REVIEW_OR_ADMIN_UAT_HUMAN_INPUT', 'Gate 3 stop boundary changed.')
  assert(report.includes('No subtraction of 398 and 378 is interpreted as 20 missing assets.'), 'The preparation report must preserve the asset count-domain guardrail.')
  assert(executionStatus.includes('Gate 4 production mutation and cutover: **NOT AUTHORIZED**'), 'Execution status does not preserve the Gate 4 prohibition.')

  assert(baseline.phase13Baseline === '598882e371a01c832832d7141acec918143c133c' && baseline.gate1Commit === '57133e1a97818b4c80175ff1d733a3143c156a3c' && baseline.gate2Commit === '7623f36b3074fe38794d4a5096b8b1d075345e93', 'Gate 3 Git baseline evidence changed.')
  assert(git(['merge-base', '--is-ancestor', baseline.gate2Commit, 'HEAD']) === '', 'Current HEAD must descend from the Gate 2 commit.')
  assert(git(['ls-files', '.private']) === '', 'Ignored .private evidence must not be tracked.')
  assert(!git(['tag', '--list', 'phase-14*']).trim(), 'A Phase 14 completion tag exists before the human/cutover gates are complete.')

  for (const path of requiredOutputs.filter(path => path !== requiredOutputs[12])) {
    assert(status.evidenceHashes[path] === await fileSha256(path), `${path} does not match the Gate 3 hash index.`)
  }
  assert(Object.keys(status.evidenceHashes).length === requiredOutputs.length - 1, 'Gate 3 evidence hash index is incomplete.')

  for (const [label, value] of [['production rows', productionRows], ['exception rows', exceptionRows], ['owner rows', ownerRows], ['UAT rows', uatRows], ['Gate 3 status', status], ['discrepancy package', discrepancy], ['preparation report', report]]) {
    assertNoSensitiveMaterial(value, label)
    assertNoUrlValues(value, label)
  }

  const handoffPath = 'outputs/phase-12-codex-handoff.md'
  if (await access(new URL(`../../${handoffPath}`, import.meta.url)).then(() => true).catch(() => false)) {
    assert(await fileSize(handoffPath) === 10889, 'Intentional Phase 12 handoff file size changed.')
    assert((await fileSha256(handoffPath)).toUpperCase() === 'C6464200384C2DE6C60BA970D1EE26123938CA2822AAD47EF5827D45140C9C25', 'Intentional Phase 12 handoff file hash changed.')
    assert(git(['status', '--short', '--', handoffPath]) === `?? ${handoffPath}`, 'Intentional Phase 12 handoff must remain untracked.')
  }

  console.log(JSON.stringify({ status: 'ok', gate3: 'IN_PROGRESS_HUMAN_INPUT_REQUIRED', outputs: requiredOutputs.length, audit: sha256(status.evidenceHashes) }, null, 2))
}

try { await main() }
catch (error) { console.error(error.message); process.exitCode = 1 }
