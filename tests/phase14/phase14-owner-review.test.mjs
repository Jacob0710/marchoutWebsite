import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, readCsv, sha256, stableJson, toCsv } from '../../scripts/phase14/lib.mjs'
import { generateOwnerReviewRows, humanColumns, mergeOwnerReviewRows, ownerReviewColumns, validateOwnerReviewRows } from '../../scripts/phase14/owner-review.mjs'

const source = async () => readCsv('outputs/phase-13-asset-classification.csv')

test('empty human fields are preserved and no identity is fabricated', async () => {
  const result = generateOwnerReviewRows(await source())
  assert.equal(result.rows.length, 405)
  assert.ok(result.rows.every(row => humanColumns.every(column => row[column] === '')))
})

test('rerun preserves human entries', async () => {
  const first = generateOwnerReviewRows(await source()).rows
  first[0].ownerDecision = 'approved'; first[0].reviewer = '人工審查者'; first[0].reviewedAt = '2026-08-04T01:00:00Z'; first[0].evidenceChecked = 'yes'
  const second = generateOwnerReviewRows(await source(), first)
  assert.equal(second.rows.find(row => row.stableRowId === first[0].stableRowId).reviewer, '人工審查者')
  assert.deepEqual(second.conflicts, [])
})

for (const [name, mutate, pattern] of [
  ['invalid decision rejected', row => { row.ownerDecision = 'auto-approved' }, /invalid ownerDecision/],
  ['missing reviewer rejected', row => { row.ownerDecision = 'approved'; row.reviewedAt = '2026-08-04T01:00:00Z'; row.evidenceChecked = 'yes' }, /requires reviewer/],
  ['missing reviewed_at rejected', row => { row.ownerDecision = 'approved'; row.reviewer = 'owner'; row.evidenceChecked = 'yes' }, /requires reviewedAt/]
]) test(name, async () => {
  const row = generateOwnerReviewRows(await source()).rows[0]
  mutate(row)
  assert.match(validateOwnerReviewRows([row]).join('\n'), pattern)
})

test('merge conflict is surfaced and not overwritten', async () => {
  const base = generateOwnerReviewRows(await source()).rows.slice(0, 1)
  base[0].ownerNotes = '既有人工內容'
  const incoming = structuredClone(base)
  incoming[0].ownerNotes = '衝突內容'
  const result = mergeOwnerReviewRows(base, incoming)
  assert.equal(result.conflicts.length, 1)
  assert.equal(result.rows[0].ownerNotes, '既有人工內容')
})

test('CSV escaping and Traditional Chinese round-trip', async () => {
  const row = generateOwnerReviewRows(await source()).rows[0]
  row.ownerNotes = '繁體中文，含「逗號,」與\n換行'
  const parsed = parseCsv(toCsv(ownerReviewColumns, [row]))
  assert.equal(parsed[0].ownerNotes, row.ownerNotes)
})

test('row fingerprint and stable ID do not depend on human fields', async () => {
  const row = generateOwnerReviewRows(await source()).rows[0]
  const identity = `${row.stableRowId}|${row.auditFingerprint}`
  row.ownerNotes = '人工欄位'
  assert.equal(`${row.stableRowId}|${row.auditFingerprint}`, identity)
  assert.match(row.auditFingerprint, /^[0-9a-f]{64}$/)
})

test('merge audit changes are stable and value-redacted', async () => {
  const base = generateOwnerReviewRows(await source()).rows.slice(0, 1)
  const incoming = structuredClone(base)
  incoming[0].ownerNotes = '只保留 hash 的人工註記'
  const first = mergeOwnerReviewRows(base, incoming)
  const second = mergeOwnerReviewRows(base, incoming)
  assert.equal(stableJson(first.changes), stableJson(second.changes))
  assert.equal(first.changes[0].valueHash, sha256(incoming[0].ownerNotes))
  assert.doesNotMatch(JSON.stringify(first.changes), /只保留/)
})
