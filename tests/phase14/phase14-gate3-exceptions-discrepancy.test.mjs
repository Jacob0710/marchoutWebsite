import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDiscrepancyPackage, exceptionHumanColumns, generateExceptionRows, validateExceptionRows
} from '../../scripts/phase14/gate3-review-packages.mjs'

const fixture = () => [
  ...Array.from({ length: 8 }, (_, index) => ({
    classification: 'requires_owner_review', reconciliationId: `group-${index}`, recordKind: 'source-identity-group',
    recordKey: `source-hash-${index}`, evidenceReference: `sanitized:assignment-${index}|assignment-${index + 1}`,
    duplicateStatistic: '2', reason: 'Multiple assignment requires owner review.'
  })),
  {
    classification: 'requires_owner_review', reconciliationId: 'unknown-visibility', recordKind: 'content',
    recordKey: 'production:site-settings:unknown-classification', evidenceReference: 'sanitized-inventory:contentRecords',
    reason: 'Unknown classification requires owner review.'
  }
]

test('exactly nine fail-closed exception packages are deterministic and human-blank', () => {
  const first = generateExceptionRows(fixture())
  const second = generateExceptionRows(fixture())
  assert.equal(first.rows.length, 9)
  assert.deepEqual(first, second)
  assert.deepEqual(validateExceptionRows(first.rows), [])
  assert.equal(first.rows.filter(row => row.currentAutomatedClassification === 'multiple_assignment_group').length, 8)
  assert.equal(first.rows.filter(row => row.currentAutomatedClassification === 'unknown_visibility_classification').length, 1)
  assert.ok(first.rows.every(row => exceptionHumanColumns.every(column => row[column] === '')))
  assert.ok(first.rows.every(row => row.availableOptions && row.optionConsequences && row.recommendedTechnicalAction))
})

test('exception human input is preserved and requires identity, timestamp, and notes', () => {
  const rows = generateExceptionRows(fixture()).rows
  rows[0].ownerDecision = 'defer'
  assert.match(validateExceptionRows(rows).join('\n'), /requires ownerNotes|requires reviewer|requires reviewedAt/)
  rows[0].ownerNotes = '待人工補充證據'
  rows[0].reviewer = '人工審查者'
  rows[0].reviewedAt = '2026-08-04T01:02:03Z'
  assert.deepEqual(validateExceptionRows(rows), [])
  assert.equal(generateExceptionRows(fixture(), rows).rows.find(row => row.stableRowId === rows[0].stableRowId).ownerNotes, '待人工補充證據')
})

test('28/27 package explains the technical cause but remains owner-unresolved', () => {
  const output = buildDiscrepancyPackage({
    duplicateSourceHash: '869e8b6837b13c7c75aaf9a8bc4ce473535979e45f529bfe6aad7e8217b02208',
    productionObjectCount: 378, assignedUniqueSources: 370, multipleAssignmentGroups: 8
  })
  assert.match(output, /Status: \*\*UNRESOLVED\*\*/)
  assert.match(output, /398 asset rows but 397 source-unique identities/)
  assert.match(output, /398 - 370 = 28/)
  assert.match(output, /397 - 370 = 27/)
  assert.match(output, /\| final decision \| {2}\|/)
  assert.match(output, /cannot choose the owner's historical-report disposition/)
})
