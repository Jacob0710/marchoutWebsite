import { sha256, toCsv } from './lib.mjs'

export const adminUatHumanColumns = [
  'environment', 'releaseSha', 'tester', 'startedAt', 'completedAt', 'inputFixtureKey', 'actualResult',
  'humanResult', 'evidenceHash', 'issueReference', 'cleanupState', 'notes'
]
export const adminUatColumns = ['caseId', 'scenario', 'expectedResult', 'allowedEnvironment', 'auditFingerprint', ...adminUatHumanColumns]

export const adminUatCases = [
  ['UAT-01', 'Administrator login and logout', 'Correct login succeeds; logout clears access'],
  ['UAT-02', 'Session persistence and expiry', 'Valid session persists; expired session fails closed'],
  ['UAT-03', 'Unauthorized and inactive access', 'Page/API reads and mutations are denied'],
  ['UAT-04', 'Create Activity', 'One scoped draft is created once'],
  ['UAT-05', 'Edit and save draft', 'Valid fields persist; errors are safe'],
  ['UAT-06', 'Publish Activity', 'Approved test draft becomes public once in the non-production UAT environment'],
  ['UAT-07', 'Unpublish Activity', 'Public route becomes unavailable in the non-production UAT environment'],
  ['UAT-08', 'Image upload', 'Supported image stores privately and proxies safely'],
  ['UAT-09', 'Attachment upload and download', 'Supported attachment proxies/downloads safely'],
  ['UAT-10', 'Cover set, replace, and remove', 'Cover relation and proxy remain consistent'],
  ['UAT-11', 'Image ordering', 'Order persists and public display matches'],
  ['UAT-12', 'External video', 'Valid HTTPS link displays; invalid input fails'],
  ['UAT-13', 'Draft disclosure boundary', 'Draft data/assets are not publicly reachable'],
  ['UAT-14', 'Public content and asset proxy', 'Published page/proxy show only approved test data'],
  ['UAT-15', 'Mobile viewport and keyboard', 'Layout and controls remain usable'],
  ['UAT-16', 'Browser matrix', 'Required browsers meet critical flows'],
  ['UAT-17', 'Error states', 'Network/database/validation errors fail safely'],
  ['UAT-18', 'Duplicate submission', 'Idempotence or visible conflict prevents duplicates'],
  ['UAT-19', 'Large, empty, and unsupported file', 'Upload is rejected without an orphan object'],
  ['UAT-20', 'Owner content spot check', 'Human owner confirms selected content'],
  ['UAT-21', 'Personal and sensitive content', 'Human privacy review confirms or blocks'],
  ['UAT-22', 'Audit evidence', 'Sanitized evidence is complete and traceable'],
  ['UAT-23', 'Cleanup and rollback readiness', 'Disposable data cleanup and rollback readiness are verified without production action']
].map(([caseId, scenario, expectedResult]) => ({
  caseId, scenario, expectedResult,
  allowedEnvironment: 'staging|dedicated-uat|local-isolated'
}))

const hasHumanData = row => adminUatHumanColumns.some(column => String(row?.[column] || '').trim())
const humanValues = prior => Object.fromEntries(adminUatHumanColumns.map(column => [column, prior?.[column] || '']))
const isoUtc = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value || '')

export const generateAdminUatRows = (existingRows = []) => {
  const existing = new Map(existingRows.map(row => [row.caseId, row]))
  const conflicts = []
  const rows = adminUatCases.map(item => {
    const projection = { caseId: item.caseId, scenario: item.scenario, expectedResult: item.expectedResult, allowedEnvironment: item.allowedEnvironment }
    const auditFingerprint = sha256(projection)
    const prior = existing.get(item.caseId)
    if (prior && prior.auditFingerprint !== auditFingerprint && hasHumanData(prior)) conflicts.push({ caseId: item.caseId, reason: 'Machine UAT case changed while human fields exist.' })
    return { ...projection, auditFingerprint, ...humanValues(prior) }
  })
  return { rows, conflicts }
}

export const validateAdminUatRows = rows => {
  const errors = []
  const expected = new Map(adminUatCases.map(item => [item.caseId, item]))
  const ids = new Set()
  for (const [index, row] of rows.entries()) {
    const at = `row ${index + 2} (${row.caseId || 'missing-id'})`
    const source = expected.get(row.caseId)
    if (!source) errors.push(`${at}: unknown UAT case ID`)
    if (ids.has(row.caseId)) errors.push(`${at}: duplicate UAT case ID`)
    ids.add(row.caseId)
    if (source) {
      const projection = { caseId: source.caseId, scenario: source.scenario, expectedResult: source.expectedResult, allowedEnvironment: source.allowedEnvironment }
      if (row.scenario !== source.scenario || row.expectedResult !== source.expectedResult || row.allowedEnvironment !== source.allowedEnvironment) errors.push(`${at}: machine case definition changed`)
      if (row.auditFingerprint !== sha256(projection)) errors.push(`${at}: auditFingerprint mismatch`)
    }
    const touched = hasHumanData(row)
    const result = row.humanResult?.trim()
    if (!touched) continue
    if (!['pass', 'fail', 'blocked', 'not-applicable'].includes(result)) errors.push(`${at}: humanResult must be pass, fail, blocked, or not-applicable`)
    if (!['staging', 'dedicated-uat', 'local-isolated'].includes(row.environment)) errors.push(`${at}: environment must be non-production`)
    if (row.environment === 'production') errors.push(`${at}: production mutation UAT is prohibited`)
    if (!/^[0-9a-f]{40}$/.test(row.releaseSha || '')) errors.push(`${at}: releaseSha is required`)
    if (!row.tester?.trim()) errors.push(`${at}: tester is required`)
    if (!isoUtc(row.startedAt) || !isoUtc(row.completedAt)) errors.push(`${at}: startedAt and completedAt must be UTC ISO timestamps`)
    if (isoUtc(row.startedAt) && isoUtc(row.completedAt) && Date.parse(row.completedAt) < Date.parse(row.startedAt)) errors.push(`${at}: completedAt precedes startedAt`)
    if (!/^[0-9a-f]{64}$/.test(row.evidenceHash || '')) errors.push(`${at}: sanitized evidenceHash is required`)
    if (result === 'fail' && !row.issueReference?.trim()) errors.push(`${at}: fail requires issueReference`)
    if (result === 'blocked' && !row.notes?.trim() && !row.issueReference?.trim()) errors.push(`${at}: blocked requires notes or issueReference`)
    if (result === 'not-applicable' && !row.notes?.trim()) errors.push(`${at}: not-applicable requires notes`)
    if (['UAT-04', 'UAT-05', 'UAT-06', 'UAT-07', 'UAT-08', 'UAT-09', 'UAT-10', 'UAT-11', 'UAT-18', 'UAT-19', 'UAT-23'].includes(row.caseId) && !row.cleanupState?.trim()) errors.push(`${at}: mutation/cleanup case requires cleanupState`)
  }
  for (const id of expected.keys()) if (!ids.has(id)) errors.push(`missing UAT case ${id}`)
  if (rows.length !== adminUatCases.length) errors.push(`expected ${adminUatCases.length} UAT cases; observed ${rows.length}`)
  return errors
}

export const adminUatStatus = rows => {
  const errors = validateAdminUatRows(rows)
  const count = value => rows.filter(row => row.humanResult === value).length
  return {
    total_cases: rows.length,
    unexecuted_cases: rows.filter(row => !row.humanResult).length,
    pass_cases: count('pass'), fail_cases: count('fail'), blocked_cases: count('blocked'), not_applicable_cases: count('not-applicable'),
    invalid_rows: new Set(errors.map(error => error.match(/\(([^)]+)\)/)?.[1]).filter(Boolean)).size,
    human_executed_cases: rows.filter(row => row.humanResult).length,
    audit_sha256: sha256(toCsv(adminUatColumns, rows)),
    adminUatExecutionsClaimedByAutomation: 0
  }
}

export const adminUatStatusMarkdown = (status, rows) => `# Phase 14 admin UAT execution status\n\n` +
  `Status: **${status.unexecuted_cases === 0 && status.invalid_rows === 0 ? 'HUMAN RESULTS RECORDED; FINAL REVIEW REQUIRED' : 'NOT EXECUTED — HUMAN INPUT REQUIRED'}**. Automated browser tests are prerequisites only and are not counted as human UAT.\n\n` +
  `Allowed execution environments: \`staging\`, \`dedicated-uat\`, or \`local-isolated\`. Production CRUD UAT is prohibited.\n\n` +
  `| Metric | Count |\n| --- | ---: |\n| total cases | ${status.total_cases} |\n| unexecuted | ${status.unexecuted_cases} |\n| pass | ${status.pass_cases} |\n| fail | ${status.fail_cases} |\n| blocked | ${status.blocked_cases} |\n| not applicable | ${status.not_applicable_cases} |\n| invalid rows | ${status.invalid_rows} |\n\n` +
  `Pending case IDs: ${rows.filter(row => !row.humanResult).map(row => `\`${row.caseId}\``).join(', ') || 'none'}.\n\n` +
  `Working-copy audit SHA-256: \`${status.audit_sha256}\`. Tester identity, timestamps, results, evidence hashes, and notes must come from the administrator who actually executes each case.\n`

export const adminUatEvidenceIndexMarkdown = rows => `# Phase 14 admin UAT evidence index\n\n` +
  `Private screenshots, cookies, session material, and raw logs belong only under ignored \`.private/phase14-admin-uat/\`. This tracked index contains case IDs and sanitized SHA-256 values supplied by the human tester.\n\n` +
  `| Case ID | Human result | Evidence SHA-256 | Issue reference |\n| --- | --- | --- | --- |\n` +
  rows.map(row => `| \`${row.caseId}\` | ${row.humanResult || ''} | ${row.evidenceHash ? `\`${row.evidenceHash}\`` : ''} | ${row.issueReference || ''} |`).join('\n') +
  `\n\nNo evidence hash or result is generated by automation.\n`
