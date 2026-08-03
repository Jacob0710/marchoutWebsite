import assert from 'node:assert/strict'
import test from 'node:test'
import { readCsv, readJsonl, stableJson } from '../../scripts/phase13/lib.mjs'
import { normalizeAssetInventory } from '../../scripts/phase13/normalize-asset-inventory.mjs'
import { normalizeSourceInventory } from '../../scripts/phase13/normalize-source-inventory.mjs'

const loadEvidence = async () => ({
  sourceRows: await readJsonl('migration/phase9/source-inventory.jsonl'),
  contentRows: await readJsonl('migration/phase9/content-manifest.jsonl'),
  assetRows: await readJsonl('migration/phase9/assets-manifest.jsonl'),
  reviewRows: await readCsv('migration/phase9/manual-review.csv')
})

test('count domains remain separate and historically sourced', async () => {
  const evidence = await loadEvidence()
  const source = normalizeSourceInventory(evidence)
  const assets = normalizeAssetInventory(evidence)
  assert.equal(source.metrics.source_inventory_items_total, 526)
  assert.equal(source.metrics.source_inventory_skip_items, 70)
  assert.equal(evidence.contentRows.filter(item => item.operation === 'create' && item.desiredStatus === 'draft').length, 70)
  assert.equal(assets.metrics.source_assets, 398)
  assert.equal(assets.metrics.migrated_storage_objects, 378)
  assert.notEqual(assets.metrics.source_assets - assets.metrics.migrated_storage_objects, assets.metrics.unassigned_source_assets_total)
})

test('same-source multi-assignment and accepted-skip assets are preserved', async () => {
  const assets = normalizeAssetInventory(await loadEvidence())
  assert.equal(assets.metrics.source_unique_assets_total, 397)
  assert.equal(assets.metrics.assigned_unique_source_objects_total, 370)
  assert.equal(assets.metrics.unassigned_source_assets_total, 27)
  assert.equal(assets.metrics.same_source_multi_assignment_groups_total, 8)
  assert.equal(assets.metrics.same_source_multi_assignment_extra_assignments_total, 8)
  assert.equal(assets.metrics.canonical_asset_relationship_records_total, 405)
  assert.equal(assets.metrics.owner_references_total, 378)
})

test('duplicate source hashes are detected without collapsing owner assignments', () => {
  const sourceRows = [
    { sourceKey: 'source:a', sourceKind: 'image', sourceUrl: 'https://example.invalid/a.jpg', sha256: 'a'.repeat(64), disposition: 'skip', byteSize: 1 },
    { sourceKey: 'source:b', sourceKind: 'image', sourceUrl: 'https://example.invalid/b.jpg', sha256: 'a'.repeat(64), disposition: 'skip', byteSize: 1 }
  ]
  const result = normalizeAssetInventory({ sourceRows, contentRows: [], assetRows: [], reviewRows: [] })
  assert.equal(result.records.length, 2)
  assert.equal(result.records[0].duplicateGroup, `source-sha256:${'a'.repeat(64)}`)
  assert.equal(result.records[1].duplicateGroup, `source-sha256:${'a'.repeat(64)}`)
})

test('normalization is deterministic', async () => {
  const evidence = await loadEvidence()
  assert.equal(stableJson(normalizeSourceInventory(evidence)), stableJson(normalizeSourceInventory(evidence)))
  assert.equal(stableJson(normalizeAssetInventory(evidence)), stableJson(normalizeAssetInventory(evidence)))
})
