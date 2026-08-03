import { countBy, readCsv, readJsonl, sha256, sortUnique } from './lib.mjs'

const normalizedDisposition = {
  migrate: 'migrated',
  merge: 'merged',
  'redirect-only': 'reused',
  archive: 'archived',
  duplicate: 'duplicate',
  'manual-review': 'requires-owner-review',
  skip: 'accepted-skip'
}

const ownerKind = value => ({
  activity: 'activity', post: 'post', file: 'file', 'year-summary': 'year-summary',
  'site-setting': 'site-settings', 'site-settings': 'site-settings', 'static-page': 'static-page'
}[value] || 'unresolved')

export const normalizeSourceInventory = ({ sourceRows, contentRows, assetRows, reviewRows }) => {
  const sourceKeyCounts = countBy(sourceRows, 'sourceKey')
  const contentBySource = new Map()
  const contentByMigrationKey = new Map(contentRows.map(item => [item.migrationKey, item]))
  for (const item of contentRows) {
    for (const key of sortUnique([item.sourceKey, ...(item.sourceKeys || [])])) {
      const values = contentBySource.get(key) || []
      values.push(item)
      contentBySource.set(key, values)
    }
  }
  const assetsBySource = new Map()
  for (const item of assetRows) {
    const values = assetsBySource.get(item.sourceKey) || []
    values.push(item)
    assetsBySource.set(item.sourceKey, values)
  }
  const reviewsBySource = new Map()
  for (const item of reviewRows) {
    const values = reviewsBySource.get(item.source_key) || []
    values.push(item)
    reviewsBySource.set(item.source_key, values)
  }

  const records = sourceRows.map(source => {
    const duplicateHistoricalKey = sourceKeyCounts[source.sourceKey] > 1
    const directContent = (contentBySource.get(source.sourceKey) || []).filter(item => !duplicateHistoricalKey || !item.sourceUrl || item.sourceUrl === source.sourceUrl)
    const assignments = (assetsBySource.get(source.sourceKey) || []).filter(item => !duplicateHistoricalKey || !item.sourceUrl || item.sourceUrl === source.sourceUrl)
    const ownerContent = assignments.map(item => contentByMigrationKey.get(item.ownerMigrationKey)).filter(Boolean)
    const targets = [...directContent, ...ownerContent]
    const ownerKinds = sortUnique([
      ...targets.map(item => ownerKind(item.targetKind)),
      ...assignments.map(item => ownerKind(item.ownerKind)),
      ownerKind(source.targetKind)
    ].filter(value => value !== 'unresolved'))
    const migrationKeys = sortUnique([...targets.map(item => item.migrationKey), ...assignments.map(item => item.ownerMigrationKey)])
    const statuses = sortUnique(targets.map(item => item.desiredStatus))
    const ownerReviewRows = targets.flatMap(item => reviewsBySource.get(item.sourceKey) || [])
    const reviews = [...(reviewsBySource.get(source.sourceKey) || []), ...ownerReviewRows]
    const isSourceAsset = ['image', 'attachment'].includes(source.sourceKind)
    const targetStatus = statuses.length === 1 ? statuses[0] : statuses.length ? 'unresolved' : 'not-applicable'
    const notes = sortUnique([
      source.reason || null,
      migrationKeys.length > 1 ? `Multiple owner assignments are retained (${migrationKeys.length}); no single owner key is inferred.` : null,
      source.disposition === 'redirect-only' ? 'Historical redirect-only disposition is represented as reused; redirect activation remains out of scope.' : null,
      isSourceAsset && assignments.length === 0 ? 'No Storage assignment exists in the Phase 9 asset manifest; historical accepted-skip evidence is retained for Phase 14 owner review.' : null,
      duplicateHistoricalKey ? `The Phase 9 inventory repeats historical sourceKey ${source.sourceKey} for distinct source URLs; sourceItemKey adds a deterministic URL-hash suffix.` : null
    ])
    return {
      schemaVersion: 1,
      sourceItemKey: duplicateHistoricalKey ? `${source.sourceKey}#source-url-${sha256(source.sourceUrl || source.title || '').slice(0, 12)}` : source.sourceKey,
      sourceKind: source.sourceKind,
      sourceUrl: source.sourceUrl || null,
      sourcePageUrl: ['image', 'attachment'].includes(source.sourceKind) ? null : source.sourceUrl || null,
      sourceTitle: source.title || null,
      sourceSnapshotSha256: source.sha256 || null,
      historicalDisposition: source.disposition,
      normalizedDisposition: normalizedDisposition[source.disposition] || 'missing-evidence',
      targetOwnerKind: ownerKinds.length === 1 ? ownerKinds[0] : 'unresolved',
      targetOwnerMigrationKey: migrationKeys.length === 1 ? migrationKeys[0] : null,
      targetStatus,
      reviewStatus: reviews.length ? 'requires-owner-review' : source.disposition === 'redirect-only' ? 'accepted-out-of-scope' : 'not-required',
      privacyStatus: targetStatus === 'draft' ? 'private-draft' : ['wix', 'external-public', 'repository'].includes(source.sourceSystem) ? 'public-source' : 'unknown',
      evidenceFiles: sortUnique([
        'migration/phase9/source-inventory.jsonl',
        directContent.length || ownerContent.length ? 'migration/phase9/content-manifest.jsonl' : null,
        assignments.length ? 'migration/phase9/assets-manifest.jsonl' : null,
        reviews.length ? 'migration/phase9/manual-review.csv' : null
      ]),
      notes
    }
  }).sort((a, b) => a.sourceItemKey.localeCompare(b.sourceItemKey))

  return {
    records,
    metrics: {
      source_inventory_items_total: records.length,
      source_inventory_items_by_historical_disposition: countBy(records, 'historicalDisposition'),
      source_inventory_skip_items: records.filter(item => item.historicalDisposition === 'skip').length
    }
  }
}

export const loadAndNormalizeSourceInventory = async () => normalizeSourceInventory({
  sourceRows: await readJsonl('migration/phase9/source-inventory.jsonl'),
  contentRows: await readJsonl('migration/phase9/content-manifest.jsonl'),
  assetRows: await readJsonl('migration/phase9/assets-manifest.jsonl'),
  reviewRows: await readCsv('migration/phase9/manual-review.csv')
})

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/normalize-source-inventory.mjs')) {
  const result = await loadAndNormalizeSourceInventory()
  console.log(JSON.stringify({ status: 'ok', ...result.metrics }, null, 2))
}
