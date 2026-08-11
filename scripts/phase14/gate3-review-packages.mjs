import { humanColumns as ownerHumanColumns } from './owner-review.mjs'
import { sha256, stableJson } from './lib.mjs'

export const productionOnlyHumanColumns = ['finalHumanDisposition', 'reviewer', 'reviewedAt', 'humanNotes']
export const productionOnlyColumns = [
  'stableId', 'domain', 'sanitizedIdentity', 'productionEvidenceHash', 'productionEvidenceReference', 'reason',
  'proposedClassification', 'automationConfidence', 'humanConfirmationRequired', 'cutoverImpact', 'auditFingerprint',
  ...productionOnlyHumanColumns
]
export const productionOnlyClassifications = new Set([
  'expected_operational_metadata', 'expected_storage_representation', 'expected_system_record',
  'expected_relationship_representation', 'valid_production_only_content', 'requires_owner_confirmation',
  'requires_admin_confirmation', 'requires_technical_followup', 'cutover_blocker', 'invalid_or_unexpected'
])
const productionOnlyFinalDispositions = new Set([
  'confirmed-expected', 'confirmed-valid-content', 'requires-technical-followup', 'defer', 'reject', 'cutover-blocker'
])

const hasHumanData = (row, columns) => columns.some(column => String(row?.[column] || '').trim())
const isoUtc = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value || '')
const preserveHuman = (prior, columns) => Object.fromEntries(columns.map(column => [column, prior?.[column] || '']))

const productionOnlyProposal = item => {
  if (item.recordKind === 'editorial-target') return {
    proposedClassification: 'expected_operational_metadata', automationConfidence: 'high', humanConfirmationRequired: 'owner',
    cutoverImpact: 'owner-confirmation-required-before-cutover',
    reason: 'Current editorial control metadata represents a matched imported target but has no separate Phase 13 comparison row.'
  }
  if (item.recordKind === 'editorial-redirect') return {
    proposedClassification: 'expected_system_record', automationConfidence: 'high', humanConfirmationRequired: 'owner',
    cutoverImpact: 'redirect-disposition-confirmation-required',
    reason: 'Current redirect decision metadata is expected system state outside the Phase 13 target/asset comparison set; it is not an active redirect.'
  }
  if (item.recordKind === 'site-settings') return {
    proposedClassification: 'expected_system_record', automationConfidence: 'high', humanConfirmationRequired: 'owner-and-admin',
    cutoverImpact: 'configuration-confirmation-required',
    reason: 'The singleton site-settings record is expected system configuration outside the Phase 13 migration comparison set.'
  }
  if (item.recordKind === 'activity') return {
    proposedClassification: 'requires_owner_confirmation', automationConfidence: 'medium', humanConfirmationRequired: 'owner',
    cutoverImpact: 'content-confirmation-required',
    reason: 'The Activity exists in current production but is not one of the 70 Phase 13 imported target identities.'
  }
  return {
    proposedClassification: 'invalid_or_unexpected', automationConfidence: 'low', humanConfirmationRequired: 'owner-and-admin',
    cutoverImpact: 'cutover-blocker-until-classified', reason: 'The production-only record kind is not covered by a known Gate 3 proposal rule.'
  }
}

export const generateProductionOnlyRows = (reconciliationRows, inventory, existingRows = []) => {
  const inventoryByKey = new Map(inventory.contentRecords.map(item => [item.recordKey, item]))
  const existing = new Map(existingRows.map(row => [row.stableId, row]))
  const conflicts = []
  const rows = reconciliationRows.filter(row => row.classification === 'production_only').map(result => {
    const item = inventoryByKey.get(result.recordKey)
    if (!item) throw new Error(`Production-only reconciliation row has no sanitized content record: ${result.reconciliationId}.`)
    const proposal = productionOnlyProposal(item)
    const sanitizedIdentity = `${item.recordKind}:${sha256(item.recordKey).slice(0, 24)}`
    const projection = {
      domain: item.recordKind,
      sanitizedIdentity,
      productionEvidenceHash: item.metadataFingerprint,
      productionEvidenceReference: `private:normalized.v1.json#contentRecords/${sanitizedIdentity}`,
      ...proposal
    }
    const stableId = `p14-production-only-${sha256(`${result.reconciliationId}|${item.recordKey}`).slice(0, 24)}`
    const auditFingerprint = sha256(projection)
    const prior = existing.get(stableId)
    if (prior && prior.auditFingerprint !== auditFingerprint && hasHumanData(prior, productionOnlyHumanColumns)) {
      conflicts.push({ stableId, reason: 'Automated production-only evidence changed while human fields exist.' })
    }
    return { stableId, ...projection, auditFingerprint, ...preserveHuman(prior, productionOnlyHumanColumns) }
  }).sort((a, b) => a.stableId.localeCompare(b.stableId))
  return { rows, conflicts }
}

export const validateProductionOnlyRows = (rows, expectedCount = 158) => {
  const errors = []
  const ids = new Set()
  for (const [index, row] of rows.entries()) {
    const at = `row ${index + 2} (${row.stableId || 'missing-id'})`
    if (!/^p14-production-only-[0-9a-f]{24}$/.test(row.stableId || '')) errors.push(`${at}: invalid stableId`)
    if (ids.has(row.stableId)) errors.push(`${at}: duplicate stableId`)
    ids.add(row.stableId)
    if (!productionOnlyClassifications.has(row.proposedClassification)) errors.push(`${at}: invalid proposedClassification`)
    if (!['high', 'medium', 'low'].includes(row.automationConfidence)) errors.push(`${at}: invalid automationConfidence`)
    if (!['owner', 'admin', 'owner-and-admin'].includes(row.humanConfirmationRequired)) errors.push(`${at}: invalid humanConfirmationRequired`)
    if (!/^[0-9a-f]{64}$/.test(row.productionEvidenceHash || '')) errors.push(`${at}: invalid productionEvidenceHash`)
    const projection = Object.fromEntries(productionOnlyColumns.slice(1, 10).map(column => [column, row[column]]))
    if (row.auditFingerprint !== sha256(projection)) errors.push(`${at}: auditFingerprint mismatch`)
    const decision = row.finalHumanDisposition?.trim()
    const anyHuman = hasHumanData(row, productionOnlyHumanColumns)
    if (decision && !productionOnlyFinalDispositions.has(decision)) errors.push(`${at}: invalid finalHumanDisposition`)
    if (anyHuman && !decision) errors.push(`${at}: human fields require finalHumanDisposition`)
    if (decision && !row.reviewer?.trim()) errors.push(`${at}: finalHumanDisposition requires reviewer`)
    if (decision && !isoUtc(row.reviewedAt)) errors.push(`${at}: finalHumanDisposition requires reviewedAt in UTC ISO format`)
    if (['requires-technical-followup', 'defer', 'reject', 'cutover-blocker'].includes(decision) && !row.humanNotes?.trim()) errors.push(`${at}: ${decision} requires humanNotes`)
  }
  if (expectedCount !== null && rows.length !== expectedCount) errors.push(`expected ${expectedCount} production-only rows; observed ${rows.length}`)
  return errors
}

export const productionOnlySummary = rows => ({
  total: rows.length,
  proposedClassifications: Object.fromEntries([...productionOnlyClassifications].sort().map(value => [value, rows.filter(row => row.proposedClassification === value).length])),
  automationConfidence: Object.fromEntries(['high', 'medium', 'low'].map(value => [value, rows.filter(row => row.automationConfidence === value).length])),
  finalHumanDispositions: rows.filter(row => row.finalHumanDisposition).length,
  unreviewed: rows.filter(row => !row.finalHumanDisposition).length
})

export const exceptionHumanColumns = ['ownerDecision', 'ownerNotes', 'reviewer', 'reviewedAt']
export const exceptionColumns = [
  'stableRowId', 'canonicalRelationshipId', 'sourceIdentity', 'productionIdentity', 'sourceEvidence', 'productionEvidenceHash',
  'currentAutomatedClassification', 'whyAutomationCannotDecide', 'availableOptions', 'optionConsequences',
  'recommendedTechnicalAction', 'auditFingerprint', ...exceptionHumanColumns, 'followUpStatus', 'cutoverBlocker'
]
const exceptionDecisions = new Set([
  'confirm-multiple-assignment', 'split-owner', 'replace', 'remigrate', 'confirm-expected-system-record',
  'requires-admin-confirmation', 'requires-technical-followup', 'defer', 'block-cutover'
])

const exceptionProjection = result => {
  if (result.recordKind === 'source-identity-group') {
    const groupHash = sha256(result.recordKey).slice(0, 24)
    return {
      canonicalRelationshipId: `multiple-assignment-group:${sha256(result.evidenceReference).slice(0, 24)}`,
      sourceIdentity: `source:${groupHash}`,
      productionIdentity: `production-source-group:${groupHash}`,
      sourceEvidence: 'outputs/phase-13-asset-classification.csv#multiple-assignment-group',
      productionEvidenceHash: sha256({ recordKey: result.recordKey, evidenceReference: result.evidenceReference, duplicateStatistic: result.duplicateStatistic }),
      currentAutomatedClassification: 'multiple_assignment_group',
      whyAutomationCannotDecide: 'One source identity is intentionally referenced by multiple assignments; metadata can prove the group but not the owner intent for every use.',
      availableOptions: 'confirm-multiple-assignment | split-owner | replace | remigrate | defer | block-cutover',
      optionConsequences: 'Confirm preserves all assignments; split/replace/remigrate requires later authorized work; defer keeps Gate 3 open; block-cutover prevents Gate 4.',
      recommendedTechnicalAction: 'Compare every related owner/role in the 405-row review and preserve current production state until the owner decides.'
    }
  }
  return {
    canonicalRelationshipId: 'not-applicable',
    sourceIdentity: 'not-applicable',
    productionIdentity: `content:${sha256(result.recordKey).slice(0, 24)}`,
    sourceEvidence: 'schemas/phase14/production-inventory-export.v1.schema.json#contentRecord',
    productionEvidenceHash: sha256({ recordKey: result.recordKey, evidenceReference: result.evidenceReference, reason: result.reason }),
    currentAutomatedClassification: 'unknown_visibility_classification',
    whyAutomationCannotDecide: 'The sanitized record has a non-applicable publication state and an unknown visibility value; automation cannot supply a business visibility decision.',
    availableOptions: 'confirm-expected-system-record | requires-admin-confirmation | requires-technical-followup | defer | block-cutover',
    optionConsequences: 'Confirmation treats the record as expected system metadata; admin/technical follow-up gathers more evidence; defer keeps Gate 3 open; block-cutover prevents Gate 4.',
    recommendedTechnicalAction: 'Have the owner and administrator confirm the singleton system-record classification without changing production.'
  }
}

export const generateExceptionRows = (reconciliationRows, existingRows = []) => {
  const existing = new Map(existingRows.map(row => [row.stableRowId, row]))
  const conflicts = []
  const rows = reconciliationRows.filter(row => row.classification === 'requires_owner_review').map(result => {
    const projection = exceptionProjection(result)
    const stableRowId = `p14-exception-${sha256(result.reconciliationId).slice(0, 24)}`
    const auditFingerprint = sha256(projection)
    const prior = existing.get(stableRowId)
    if (prior && prior.auditFingerprint !== auditFingerprint && hasHumanData(prior, exceptionHumanColumns)) {
      conflicts.push({ stableRowId, reason: 'Automated exception evidence changed while human fields exist.' })
    }
    return {
      stableRowId, ...projection, auditFingerprint, ...preserveHuman(prior, exceptionHumanColumns),
      followUpStatus: prior?.followUpStatus || 'awaiting-owner',
      cutoverBlocker: prior?.cutoverBlocker || 'pending-owner-review'
    }
  }).sort((a, b) => a.stableRowId.localeCompare(b.stableRowId))
  return { rows, conflicts }
}

export const validateExceptionRows = (rows, expectedCount = 9) => {
  const errors = []
  const ids = new Set()
  for (const [index, row] of rows.entries()) {
    const at = `row ${index + 2} (${row.stableRowId || 'missing-id'})`
    if (!/^p14-exception-[0-9a-f]{24}$/.test(row.stableRowId || '')) errors.push(`${at}: invalid stableRowId`)
    if (ids.has(row.stableRowId)) errors.push(`${at}: duplicate stableRowId`)
    ids.add(row.stableRowId)
    if (!/^[0-9a-f]{64}$/.test(row.productionEvidenceHash || '')) errors.push(`${at}: invalid productionEvidenceHash`)
    const projection = Object.fromEntries(exceptionColumns.slice(1, 11).map(column => [column, row[column]]))
    if (row.auditFingerprint !== sha256(projection)) errors.push(`${at}: auditFingerprint mismatch`)
    const decision = row.ownerDecision?.trim()
    const anyHuman = hasHumanData(row, exceptionHumanColumns)
    if (decision && !exceptionDecisions.has(decision)) errors.push(`${at}: invalid ownerDecision`)
    if (anyHuman && !decision) errors.push(`${at}: human fields require ownerDecision`)
    if (decision && !row.ownerNotes?.trim()) errors.push(`${at}: ownerDecision requires ownerNotes`)
    if (decision && !row.reviewer?.trim()) errors.push(`${at}: ownerDecision requires reviewer`)
    if (decision && !isoUtc(row.reviewedAt)) errors.push(`${at}: ownerDecision requires reviewedAt in UTC ISO format`)
  }
  if (expectedCount !== null && rows.length !== expectedCount) errors.push(`expected ${expectedCount} exception rows; observed ${rows.length}`)
  return errors
}

export const buildDiscrepancyPackage = ({ duplicateSourceHash, productionObjectCount, assignedUniqueSources, multipleAssignmentGroups }) => `# Phase 14 evidence discrepancy decision package\n\n` +
  `Status: **UNRESOLVED**. Automation explains the count-domain difference but cannot create the owner's final decision.\n\n` +
  `## Side-by-side evidence\n\n` +
  `| Evidence | Count | Count domain | Reference |\n| --- | ---: | --- | --- |\n` +
  `| Phase 9 narrative "unassigned" arithmetic | 28 | 398 source asset inventory rows minus 370 assigned unique source identities | \`outputs/phase-9-completion-report.md\` |\n` +
  `| Authoritative accepted-skip manifest identities | 27 | source-unique asset identities with \`disposition=skip\` | \`migration/phase9/source-inventory.jsonl\`; \`outputs/phase-13-asset-classification.csv\` |\n\n` +
  `## Identity-list difference\n\n` +
  `The source inventory contains 398 asset rows but 397 source-unique identities. One assigned attachment identity, \`${duplicateSourceHash}\`, occurs in two \`migrate\` rows under distinct source URLs. It is an assigned duplicate row, not an additional accepted-skip identity. Therefore \`398 - 370 = 28\` mixes an inventory-row count with a unique-identity count, while \`397 - 370 = 27\` compares unique identities consistently. No non-asset row or merged skip identity is needed to explain the one-row difference.\n\n` +
  `## Production supporting evidence\n\n` +
  `Gate 2 observed ${productionObjectCount} private Storage objects mapped to ${assignedUniqueSources} assigned unique source identities and ${multipleAssignmentGroups} known multiple-assignment groups. It observed no missing assignment identity, but the 27 accepted-skip identities intentionally have no production Storage assignment. Production evidence supports the assignment side; it cannot decide whether the owner accepts the historical narrative wording.\n\n` +
  `## Decision boundary\n\n` +
  `Automation can determine the statistical cause: one duplicate assigned source row and mixed row/unique count domains. Automation cannot choose the owner's historical-report disposition or sign the discrepancy resolution.\n\n` +
  `Owner options:\n\n` +
  `1. \`accept-manifest-27-canonical\` — use 27 as the canonical accepted-skip identity count and annotate the Phase 9 narrative as mixed-domain arithmetic.\n` +
  `2. \`retain-both-distinct-domains\` — retain 28 only as the historical row-minus-unique arithmetic statement and 27 as the canonical identity count.\n` +
  `3. \`request-additional-source-evidence\` — keep the discrepancy open pending more owner evidence.\n` +
  `4. \`block-cutover\` — treat the unresolved discrepancy as a Gate 4 blocker.\n\n` +
  `| Human field | Value |\n| --- | --- |\n| final decision |  |\n| decision rationale |  |\n| reviewer |  |\n| reviewed_at |  |\n| evidence references confirmed |  |\n\n` +
  `The final decision fields must remain blank until supplied by the owner.\n`

export const assertNoOwnerIdentityFabrication = rows => {
  for (const row of rows) {
    for (const column of [...ownerHumanColumns, ...productionOnlyHumanColumns, ...exceptionHumanColumns]) {
      if (Object.hasOwn(row, column) && /^(?:automation|codex|github|windows|admin)$/i.test(String(row[column] || '').trim())) {
        throw new Error(`Fabricated human identity/value detected in ${column}.`)
      }
    }
  }
}

export const stableRowsHash = rows => sha256(stableJson(rows))
