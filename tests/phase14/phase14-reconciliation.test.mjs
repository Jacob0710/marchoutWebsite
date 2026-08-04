import assert from 'node:assert/strict'
import test from 'node:test'
import { readJson, sha256, stableJson } from '../../scripts/phase14/lib.mjs'
import { reconcileFailClosed, reconcileInventory } from '../../scripts/phase14/reconcile-inventory.mjs'

const load = async () => [await readJson('fixtures/phase14/reconciliation-baseline.sample.v1.json'), await readJson('fixtures/phase14/production-inventory.sample.v1.json')]
const rowsFor = (rows, classification) => rows.filter(row => row.classification === classification)

test('exact match is classified without publication approval', async () => {
  const rows = await reconcileInventory(...await load())
  assert.ok(rowsFor(rows, 'matched').some(row => row.recordKey === 'content:activity:match'))
})

for (const [name, classification, key] of [
  ['production only', 'production_only', 'content:faq:production-only'],
  ['offline only and missing asset object', 'offline_only', 'object:missing'],
  ['metadata mismatch', 'metadata_mismatch', 'content:post:metadata-change'],
  ['relationship mismatch', 'relationship_mismatch', 'relationship:changed'],
  ['publication mismatch', 'publication_state_mismatch', 'content:file:publication-change'],
  ['checksum mismatch', 'asset_identity_mismatch', 'object:checksum-change'],
  ['accepted skip', 'accepted_skip', 'relationship:accepted-skip'],
  ['evidence discrepancy', 'evidence_discrepancy', 'P14-DISC-001']
]) test(name, async () => assert.ok(rowsFor(await reconcileInventory(...await load()), classification).some(row => row.recordKey === key)))

test('duplicate source and multiple assignment require owner review', async () => {
  const rows = rowsFor(await reconcileInventory(...await load()), 'requires_owner_review')
  assert.ok(rows.some(row => row.recordKey === 'source:duplicate'))
  assert.ok(rows.some(row => row.recordKey === 'source:asset:multi'))
})

test('unknown classification and orphan relationship require owner review', async () => {
  const rows = rowsFor(await reconcileInventory(...await load()), 'requires_owner_review')
  assert.ok(rows.some(row => row.recordKey.includes('unknown-classification')))
  assert.ok(rows.some(row => row.recordKey === 'relationship:orphan'))
})

test('invalid and sensitive inputs are distinguished fail closed', async () => {
  const [baseline, inventory] = await load()
  assert.equal((await reconcileFailClosed({}, inventory))[0].classification, 'invalid_input')
  inventory.password = 'synthetic'
  assert.equal((await reconcileFailClosed(baseline, inventory))[0].classification, 'blocked_sensitive_data')
})

test('ordering, stable IDs and rerun hash remain deterministic', async () => {
  const inputs = await load()
  const first = await reconcileInventory(...inputs)
  const second = await reconcileInventory(...inputs)
  assert.equal(stableJson(first), stableJson(second))
  assert.equal(sha256(first), sha256(second))
  assert.ok(first.every(row => /^p14-[0-9a-f]{24}$/.test(row.reconciliationId)))
  assert.deepEqual(first, [...first].sort((a, b) => `${a.classification}|${a.recordKind}|${a.recordKey}|${a.reconciliationId}`.localeCompare(`${b.classification}|${b.recordKind}|${b.recordKey}|${b.reconciliationId}`)))
})
