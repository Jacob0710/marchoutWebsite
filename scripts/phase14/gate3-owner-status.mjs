import { humanColumns, validateOwnerReviewRows } from './owner-review.mjs'
import { sha256, toCsv } from './lib.mjs'

const hasHumanData = row => humanColumns.some(column => String(row[column] || '').trim())
const decisionCount = (rows, decision) => rows.filter(row => row.ownerDecision === decision).length
const explicitBlocker = value => value && !['no', 'none', 'false', 'resolved'].includes(String(value).trim().toLowerCase())

export const ownerReviewStatus = (rows, columns) => {
  const errors = validateOwnerReviewRows(rows)
  const assignedRows = rows.filter(row => row.ownerKind !== 'unresolved').length
  const acceptedSkipSourceRows = rows.filter(row => row.ownerKind === 'unresolved' && row.currentAutomatedClassification === 'accepted_skip').length
  return {
    schemaVersion: 1,
    gate: 'phase14-owner-review',
    status: rows.every(row => row.ownerDecision) && errors.length === 0 ? 'HUMAN_REVIEW_RECORDED_VALIDATION_PENDING' : 'IN_PROGRESS_HUMAN_INPUT_REQUIRED',
    total_rows: rows.length,
    assigned_relationship_rows: assignedRows,
    accepted_skip_source_rows: acceptedSkipSourceRows,
    human_touched_rows: rows.filter(hasHumanData).length,
    unreviewed_rows: rows.filter(row => !row.ownerDecision).length,
    pending_row_ids: rows.filter(row => !row.ownerDecision).map(row => row.stableRowId),
    approved_rows: decisionCount(rows, 'approved'),
    accepted_skip_rows: decisionCount(rows, 'accepted-skip'),
    replace_rows: decisionCount(rows, 'replace'),
    remigrate_rows: decisionCount(rows, 'remigrate'),
    archive_rows: decisionCount(rows, 'archive'),
    rejected_rows: decisionCount(rows, 'rejected'),
    deferred_rows: decisionCount(rows, 'defer'),
    conflict_rows: rows.filter(row => row.currentAutomatedClassification === 'conflict' || row.resolutionStatus === 'conflict').length,
    cutover_blockers: rows.filter(row => explicitBlocker(row.cutoverBlocker)).length,
    invalid_rows: new Set(errors.map(error => error.match(/\(([^)]+)\)/)?.[1]).filter(Boolean)).size,
    audit_sha256: sha256(toCsv(columns, rows)),
    owner_signatures_created_by_automation: 0,
    decisionBoundary: 'OWNER_HUMAN_INPUT_REQUIRED'
  }
}

export const ownerReviewSummaryMarkdown = status => `# Phase 14 owner review summary\n\n` +
  `Status: **${status.status}**. Automation prepared and validated the working copy but did not create an owner decision, reviewer, timestamp, or signature.\n\n` +
  `| Metric | Count |\n| --- | ---: |\n` +
  `| total rows | ${status.total_rows} |\n` +
  `| assigned relationships | ${status.assigned_relationship_rows} |\n` +
  `| accepted-skip/unassigned source rows | ${status.accepted_skip_source_rows} |\n` +
  `| human-touched rows | ${status.human_touched_rows} |\n` +
  `| unreviewed rows | ${status.unreviewed_rows} |\n` +
  `| approved | ${status.approved_rows} |\n` +
  `| accepted skip | ${status.accepted_skip_rows} |\n` +
  `| replace | ${status.replace_rows} |\n` +
  `| remigrate | ${status.remigrate_rows} |\n` +
  `| archive | ${status.archive_rows} |\n` +
  `| rejected | ${status.rejected_rows} |\n` +
  `| deferred | ${status.deferred_rows} |\n` +
  `| conflicts | ${status.conflict_rows} |\n` +
  `| explicit cutover blockers | ${status.cutover_blockers} |\n` +
  `| invalid rows | ${status.invalid_rows} |\n\n` +
  `Working-copy audit SHA-256: \`${status.audit_sha256}\`.\n\n` +
  `The owner may edit in batches and validate after each batch. Regeneration preserves human fields when the machine audit fingerprint is unchanged; conflicts fail closed and audit changes retain value hashes only.\n`

export const ownerReviewValidation = rows => {
  const errors = validateOwnerReviewRows(rows)
  return { valid: errors.length === 0, errors }
}
