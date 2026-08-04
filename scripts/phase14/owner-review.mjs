import { parseArgs, readCsv, readText, resolveRepositoryLocalPath, sha256, stableJson, toCsv, writeJson, writeText } from './lib.mjs'

export const humanColumns = ['ownerDecision', 'ownerNotes', 'reviewer', 'reviewedAt', 'evidenceChecked', 'followUpAction', 'resolutionStatus', 'uatRelevance', 'cutoverBlocker']
export const ownerReviewColumns = [
  'stableRowId', 'canonicalRelationshipId', 'sourceEvidence', 'sourceSha256', 'sourceAssetKind', 'role', 'ownerKind', 'ownerMigrationKey',
  'currentAutomatedClassification', 'proposedDecision', 'privacyStatus', 'reviewStatus', 'auditFingerprint', ...humanColumns
]

const hasHumanData = row => humanColumns.some(column => String(row[column] || '').trim())
const sourceProjection = row => ({
  canonicalRelationshipId: row.assetKey,
  sourceEvidence: row.evidenceFiles,
  sourceSha256: row.sourceSha256,
  sourceAssetKind: row.sourceAssetKind,
  role: row.role,
  ownerKind: row.ownerKind,
  ownerMigrationKey: row.ownerMigrationKey,
  currentAutomatedClassification: row.normalizedDisposition === 'accepted-skip' ? 'accepted_skip' : row.reviewStatus,
  proposedDecision: 'manual-review-required',
  privacyStatus: row.privacyStatus,
  reviewStatus: row.reviewStatus
})

export const generateOwnerReviewRows = (sourceRows, existingRows = []) => {
  const existing = new Map(existingRows.map(row => [row.stableRowId, row]))
  const conflicts = []
  const rows = sourceRows.map(source => {
    const projection = sourceProjection(source)
    const stableRowId = `p14-owner-${sha256(source.assetKey).slice(0, 24)}`
    const auditFingerprint = sha256(projection)
    const prior = existing.get(stableRowId)
    if (prior && prior.auditFingerprint !== auditFingerprint && hasHumanData(prior)) conflicts.push({ stableRowId, reason: 'Automated source fingerprint changed while human fields exist.', priorAuditFingerprint: prior.auditFingerprint, currentAuditFingerprint: auditFingerprint })
    const human = Object.fromEntries(humanColumns.map(column => [column, prior?.[column] || '']))
    return { stableRowId, ...projection, auditFingerprint, ...human }
  }).sort((a, b) => a.stableRowId.localeCompare(b.stableRowId))
  return { rows, conflicts }
}

const decisions = new Set(['approved', 'accepted-skip', 'rejected', 'replace', 'remigrate', 'defer'])
export const validateOwnerReviewRows = rows => {
  const errors = []
  const ids = new Set()
  for (const [index, row] of rows.entries()) {
    const at = `row ${index + 2} (${row.stableRowId || 'missing-id'})`
    if (!/^p14-owner-[0-9a-f]{24}$/.test(row.stableRowId || '')) errors.push(`${at}: invalid stableRowId`)
    if (ids.has(row.stableRowId)) errors.push(`${at}: duplicate stableRowId`)
    ids.add(row.stableRowId)
    if (!/^[0-9a-f]{64}$/.test(row.auditFingerprint || '')) errors.push(`${at}: invalid auditFingerprint`)
    const decision = row.ownerDecision?.trim()
    const reviewer = row.reviewer?.trim()
    const reviewedAt = row.reviewedAt?.trim()
    if (decision && !decisions.has(decision)) errors.push(`${at}: invalid ownerDecision`)
    if (reviewer && !decision) errors.push(`${at}: reviewer cannot exist without ownerDecision`)
    if (reviewedAt && !decision) errors.push(`${at}: reviewedAt cannot exist without ownerDecision`)
    if (decision && !reviewer) errors.push(`${at}: ownerDecision requires reviewer`)
    if (decision && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(reviewedAt || '')) errors.push(`${at}: ownerDecision requires reviewedAt in UTC ISO format`)
    if (['approved', 'accepted-skip'].includes(decision) && row.evidenceChecked !== 'yes') errors.push(`${at}: approval requires evidenceChecked=yes`)
    if (['rejected', 'replace', 'remigrate'].includes(decision) && !row.ownerNotes?.trim()) errors.push(`${at}: ${decision} requires ownerNotes`)
    if (['unknown', 'conflict'].includes(row.currentAutomatedClassification) && decision === 'approved') errors.push(`${at}: unknown/conflict cannot be approved`)
  }
  return errors
}

export const mergeOwnerReviewRows = (baseRows, incomingRows) => {
  const incoming = new Map(incomingRows.map(row => [row.stableRowId, row]))
  const conflicts = []
  const changes = []
  const rows = baseRows.map(base => {
    const candidate = incoming.get(base.stableRowId)
    if (!candidate) return base
    if (candidate.auditFingerprint !== base.auditFingerprint) {
      conflicts.push({ stableRowId: base.stableRowId, reason: 'auditFingerprint mismatch' })
      return base
    }
    const merged = { ...base }
    for (const column of humanColumns) {
      const current = base[column] || ''
      const next = candidate[column] || ''
      if (current && next && current !== next) conflicts.push({ stableRowId: base.stableRowId, field: column, reason: 'conflicting human values' })
      else if (!current && next) { merged[column] = next; changes.push({ stableRowId: base.stableRowId, field: column, valueHash: sha256(next) }) }
    }
    return merged
  })
  for (const id of incoming.keys()) if (!baseRows.some(row => row.stableRowId === id)) conflicts.push({ stableRowId: id, reason: 'incoming row is not in authoritative base' })
  return { rows, conflicts: conflicts.sort((a, b) => stableJson(a).localeCompare(stableJson(b))), changes: changes.sort((a, b) => stableJson(a).localeCompare(stableJson(b))) }
}

export const runOwnerReviewCli = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv)
  if (args.mode === 'generate') {
    const source = args.source || 'outputs/phase-13-asset-classification.csv'
    const output = args.output || 'outputs/phase-14-owner-review-working.csv'
    const sourceRows = await readCsv(source)
    const existingRows = await readCsv(output).catch(() => [])
    const result = generateOwnerReviewRows(sourceRows, existingRows)
    if (result.conflicts.length) throw new Error(`Owner-review regeneration has ${result.conflicts.length} conflict(s); use an explicit merge and audit report.`)
    const errors = validateOwnerReviewRows(result.rows)
    if (errors.length) throw new Error(errors.join('; '))
    await writeText(output, toCsv(ownerReviewColumns, result.rows))
    return { status: 'ok', rows: result.rows.length, humanRows: result.rows.filter(hasHumanData).length }
  }
  if (args.mode === 'validate') {
    const input = resolveRepositoryLocalPath(args.input, '--input')
    const rows = await readCsv(input)
    const errors = validateOwnerReviewRows(rows)
    if (errors.length) throw new Error(errors.join('; '))
    return { status: 'ok', rows: rows.length, humanRows: rows.filter(hasHumanData).length }
  }
  if (args.mode === 'merge') {
    const base = resolveRepositoryLocalPath(args.base, '--base')
    const incoming = resolveRepositoryLocalPath(args.incoming, '--incoming')
    const output = resolveRepositoryLocalPath(args.output, '--output')
    const audit = resolveRepositoryLocalPath(args.audit, '--audit', { mustBeJson: true })
    const [baseRows, incomingRows] = await Promise.all([readCsv(base), readCsv(incoming)])
    const result = mergeOwnerReviewRows(baseRows, incomingRows)
    if (result.conflicts.length) { await writeJson(audit, { schemaVersion: 1, status: 'conflict', conflicts: result.conflicts, changes: [] }); throw new Error(`Owner-review merge has ${result.conflicts.length} conflict(s).`) }
    const errors = validateOwnerReviewRows(result.rows)
    if (errors.length) throw new Error(errors.join('; '))
    await writeText(output, toCsv(ownerReviewColumns, result.rows))
    await writeJson(audit, { schemaVersion: 1, status: 'merged', baseSha256: sha256(await readText(base)), incomingSha256: sha256(await readText(incoming)), changes: result.changes, conflicts: [] })
    return { status: 'ok', rows: result.rows.length, changes: result.changes.length }
  }
  throw new Error('--mode must be generate, validate, or merge.')
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/owner-review.mjs')) {
  try { console.log(JSON.stringify(await runOwnerReviewCli(), null, 2)) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
