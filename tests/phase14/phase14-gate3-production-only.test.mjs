import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, sha256, stableJson, toCsv } from '../../scripts/phase14/lib.mjs'
import {
  generateProductionOnlyRows, productionOnlyColumns, productionOnlyHumanColumns,
  productionOnlySummary, validateProductionOnlyRows
} from '../../scripts/phase14/gate3-review-packages.mjs'

const fixture = () => {
  const definitions = [
    ['editorial-target', 70], ['editorial-redirect', 83], ['activity', 4], ['site-settings', 1]
  ]
  const contentRecords = []
  const reconciliation = []
  let index = 0
  for (const [recordKind, total] of definitions) for (let offset = 0; offset < total; offset += 1) {
    const recordKey = `${recordKind}:fixture-${offset}`
    contentRecords.push({ recordKey, recordKind, metadataFingerprint: sha256({ recordKey, index }) })
    reconciliation.push({ classification: 'production_only', reconciliationId: `fixture-${index}`, recordKey })
    index += 1
  }
  return { reconciliation, inventory: { contentRecords } }
}

test('158 production-only rows receive proposals without human dispositions', () => {
  const input = fixture()
  const first = generateProductionOnlyRows(input.reconciliation, input.inventory)
  const second = generateProductionOnlyRows(input.reconciliation, input.inventory)
  assert.deepEqual(first.conflicts, [])
  assert.equal(first.rows.length, 158)
  assert.ok(first.rows.every(row => productionOnlyHumanColumns.every(column => row[column] === '')))
  assert.deepEqual(validateProductionOnlyRows(first.rows), [])
  assert.equal(stableJson(first.rows), stableJson(second.rows))
  assert.deepEqual(productionOnlySummary(first.rows), productionOnlySummary(second.rows))
  assert.deepEqual(productionOnlySummary(first.rows).proposedClassifications, {
    cutover_blocker: 0,
    expected_operational_metadata: 70,
    expected_relationship_representation: 0,
    expected_storage_representation: 0,
    expected_system_record: 84,
    invalid_or_unexpected: 0,
    requires_admin_confirmation: 0,
    requires_owner_confirmation: 4,
    requires_technical_followup: 0,
    valid_production_only_content: 0
  })
})

test('rerun preserves valid owner input and fails closed on changed machine evidence', () => {
  const input = fixture()
  const first = generateProductionOnlyRows(input.reconciliation, input.inventory).rows
  first[0].finalHumanDisposition = 'confirmed-expected'
  first[0].reviewer = '人工審查者'
  first[0].reviewedAt = '2026-08-04T01:02:03Z'
  first[0].humanNotes = '已核對非正式環境證據'
  const rerun = generateProductionOnlyRows(input.reconciliation, input.inventory, first)
  assert.deepEqual(rerun.conflicts, [])
  assert.equal(rerun.rows.find(row => row.stableId === first[0].stableId).reviewer, '人工審查者')
  input.inventory.contentRecords.find(row => row.metadataFingerprint === first[0].productionEvidenceHash).metadataFingerprint = sha256('changed')
  assert.equal(generateProductionOnlyRows(input.reconciliation, input.inventory, first).conflicts.length, 1)
})

test('partial or fabricated disposition is rejected and Unicode CSV round-trips', () => {
  const input = fixture()
  const row = generateProductionOnlyRows(input.reconciliation, input.inventory).rows[0]
  row.finalHumanDisposition = 'confirmed-expected'
  assert.match(validateProductionOnlyRows([row], null).join('\n'), /requires reviewer/)
  row.reviewer = '擁有者代表'
  row.reviewedAt = '2026-08-04T01:02:03Z'
  row.humanNotes = '繁體中文，逗號與\n換行均保留'
  const parsed = parseCsv(toCsv(productionOnlyColumns, [row]))
  assert.equal(parsed[0].humanNotes, row.humanNotes)
})
