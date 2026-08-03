import { countBy, extensionFrom, mimeFromExtension, readCsv, readJsonl, redactStoragePath, sortUnique, toCsv } from './lib.mjs'

const databaseReferenceKind = owner => ({ activity: 'activity-assets', post: 'post-cover', file: 'file', 'year-summary': 'year-summary-cover', 'site-settings': 'site-settings' }[owner] || null)

const classifySourceKind = source => {
  if (source.sourceKind === 'attachment') return 'document'
  if (source.sourceKind !== 'image') return 'unknown'
  return /(?:^|[^a-z])(logo|marchout)(?:[^a-z]|$)|社徽|愛潮/i.test(`${source.title || ''} ${source.sourceUrl || ''}`) ? 'logo' : 'image'
}

const safeFilename = (sha, extension) => sha ? `source-${sha.slice(0, 12)}${extension || ''}` : null

export const normalizeAssetInventory = ({ sourceRows, contentRows, assetRows, reviewRows }) => {
  const sourceAssetRows = sourceRows.filter(item => ['image', 'attachment'].includes(item.sourceKind))
  const sourceGroups = new Map()
  for (const source of sourceAssetRows) {
    const values = sourceGroups.get(source.sourceKey) || []
    values.push(source)
    sourceGroups.set(source.sourceKey, values)
  }
  const contentByMigrationKey = new Map(contentRows.map(item => [item.migrationKey, item]))
  const reviewsBySource = new Map()
  for (const review of reviewRows) {
    const values = reviewsBySource.get(review.source_key) || []
    values.push(review)
    reviewsBySource.set(review.source_key, values)
  }
  const assignmentsBySource = new Map()
  for (const assignment of assetRows) {
    const values = assignmentsBySource.get(assignment.sourceKey) || []
    values.push(assignment)
    assignmentsBySource.set(assignment.sourceKey, values)
  }
  const sourceHashCounts = countBy([...sourceGroups.values()].map(sources => ({ hash: sources[0].sha256 || sources[0].sourceKey })), 'hash')
  const records = []
  for (const [sourceKey, groupedSources] of [...sourceGroups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sources = groupedSources.sort((a, b) => String(a.sourceUrl || '').localeCompare(String(b.sourceUrl || '')))
    const source = sources[0]
    const assignments = (assignmentsBySource.get(source.sourceKey) || []).sort((a, b) => a.assetKey.localeCompare(b.assetKey))
    const candidates = assignments.length ? assignments : [null]
    for (const assignment of candidates) {
      const owner = assignment ? contentByMigrationKey.get(assignment.ownerMigrationKey) : null
      const matchedSource = assignment?.sourceUrl ? sources.find(item => item.sourceUrl === assignment.sourceUrl) || source : source
      const extension = extensionFrom(assignment?.originalFilename, matchedSource.sourceUrl)
      const sourceAssetKind = classifySourceKind(matchedSource)
      const ownerReviews = owner ? reviewsBySource.get(owner.sourceKey) || [] : []
      const directReviews = reviewsBySource.get(source.sourceKey) || []
      const sameSourceAssignments = assignments.length
      const notes = sortUnique([
        'sourceFilename is deterministically redacted; authoritative filename evidence remains only in the Phase 9 manifest.',
        sameSourceAssignments > 1 ? `Same source object has ${sameSourceAssignments} distinct Storage/owner assignments; each assignment is preserved.` : null,
        assignment ? null : 'No Phase 9 Storage assignment exists. Historical accepted-skip evidence indicates Wix chrome, background, or decorative use; owner confirmation is deferred to Phase 14.',
        sources.length > 1 ? `Historical sourceKey ${sourceKey} represents ${sources.length} source inventory rows with distinct URLs; assignments are normalized once and source-row provenance is retained.` : null,
        assignment?.warnings?.length ? `Phase 9 warnings: ${assignment.warnings.join('|')}` : null
      ])
      records.push({
        schemaVersion: 1,
        assetKey: assignment?.assetKey || `source-only:${source.sourceKey}`,
        sourceAssetUrl: assignment?.sourceUrl || matchedSource.sourceUrl || null,
        sourcePageUrl: null,
        sourceFilename: safeFilename(source.sha256 || assignment?.sourceSha256, extension),
        sourceExtension: extension,
        sourceMimeType: assignment?.detectedMimeType || mimeFromExtension(extension),
        sourceSha256: matchedSource.sha256 || assignment?.sourceSha256 || null,
        sourceSizeBytes: Number.isInteger(matchedSource.byteSize) ? matchedSource.byteSize : Number.isInteger(assignment?.byteSize) ? assignment.byteSize : null,
        sourceAssetKind,
        role: assignment?.role || (sourceAssetKind === 'logo' ? 'logo' : 'unknown'),
        ownerKind: assignment?.ownerKind || 'unresolved',
        ownerMigrationKey: assignment?.ownerMigrationKey || null,
        ownerTitle: owner?.payload?.title || null,
        ownerYear: Number.isInteger(owner?.payload?.academicYear) ? owner.payload.academicYear : null,
        ownerCategory: owner?.payload?.category || owner?.payload?.type || null,
        historicalDisposition: matchedSource.disposition,
        normalizedDisposition: assignment ? 'migrated' : matchedSource.disposition === 'skip' ? 'accepted-skip' : 'missing-evidence',
        targetBucket: assignment?.targetBucket || null,
        targetStoragePathRedacted: assignment ? redactStoragePath(assignment.targetNamespace, assignment.targetBucket) : null,
        targetDatabaseReferenceKind: assignment ? databaseReferenceKind(assignment.ownerKind) : null,
        targetDatabaseReferenceKey: assignment?.ownerMigrationKey || null,
        duplicateGroup: sources.length > 1 || sourceHashCounts[matchedSource.sha256 || matchedSource.sourceKey] > 1 ? `source-sha256:${matchedSource.sha256}` : null,
        privacyStatus: assignment ? 'private-draft' : 'public-source',
        reviewStatus: directReviews.length || ownerReviews.length || !assignment ? 'requires-owner-review' : 'not-required',
        evidenceFiles: sortUnique([
          'migration/phase9/source-inventory.jsonl',
          assignment ? 'migration/phase9/assets-manifest.jsonl' : null,
          owner ? 'migration/phase9/content-manifest.jsonl' : null,
          directReviews.length || ownerReviews.length ? 'migration/phase9/manual-review.csv' : null
        ]),
        notes
      })
    }
  }
  records.sort((a, b) => a.assetKey.localeCompare(b.assetKey))
  const assignedSourceKeys = new Set(assetRows.map(item => item.sourceKey))
  const multiAssignmentGroups = [...assignmentsBySource.values()].filter(items => items.length > 1)
  const uniqueSourceClassification = [...sourceGroups.values()].map(sources => classifySourceKind(sources[0]))
  const metrics = {
    canonical_asset_relationship_records_total: records.length,
    source_assets: sourceAssetRows.length,
    source_unique_assets_total: sourceGroups.size,
    source_asset_inventory_kind_counts: countBy(sourceAssetRows.map(source => ({ value: classifySourceKind(source) })), 'value'),
    source_unique_asset_kind_counts: countBy(uniqueSourceClassification.map(value => ({ value })), 'value'),
    storage_assignments_total: assetRows.length,
    migrated_storage_objects: assetRows.length,
    assigned_unique_source_objects_total: assignedSourceKeys.size,
    unassigned_source_assets_total: [...sourceGroups.keys()].filter(key => !assignedSourceKeys.has(key)).length,
    same_source_multi_assignment_groups_total: multiAssignmentGroups.length,
    same_source_multi_assignment_extra_assignments_total: multiAssignmentGroups.reduce((sum, items) => sum + items.length - 1, 0),
    owner_references_total: assetRows.filter(item => item.ownerKind && item.ownerMigrationKey).length,
    role_counts_by_relationship_record: countBy(records, 'role'),
    owner_kind_counts_by_relationship_record: countBy(records, 'ownerKind'),
    source_hash_present_relationship_records_total: records.filter(item => item.sourceSha256).length,
    target_bucket_present_relationship_records_total: records.filter(item => item.targetBucket).length,
    target_database_reference_present_relationship_records_total: records.filter(item => item.targetDatabaseReferenceKey).length,
    owner_relationship_unresolved_source_assets_total: [...sourceGroups.keys()].filter(key => !assignedSourceKeys.has(key)).length,
    duplicate_source_inventory_rows_total: sourceAssetRows.length - sourceGroups.size
  }
  return { records, metrics }
}

export const assetReviewCsv = records => {
  const columns = [
    'assetKey', 'sourceAssetKind', 'role', 'ownerKind', 'ownerMigrationKey', 'ownerTitle', 'ownerYear', 'ownerCategory',
    'historicalDisposition', 'normalizedDisposition', 'targetBucket', 'targetStoragePathRedacted', 'targetDatabaseReferenceKind',
    'targetDatabaseReferenceKey', 'sourceSha256', 'sourceFilename', 'sourceMimeType', 'sourceSizeBytes', 'privacyStatus', 'reviewStatus',
    'evidenceFiles', 'notes', 'reviewDecision', 'ownerComment', 'verifiedAt', 'verifiedBy'
  ]
  const rows = records.map(record => ({
    ...record,
    evidenceFiles: JSON.stringify(record.evidenceFiles),
    notes: JSON.stringify(record.notes),
    reviewDecision: '', ownerComment: '', verifiedAt: '', verifiedBy: ''
  }))
  return toCsv(columns, rows)
}

export const loadAndNormalizeAssetInventory = async () => normalizeAssetInventory({
  sourceRows: await readJsonl('migration/phase9/source-inventory.jsonl'),
  contentRows: await readJsonl('migration/phase9/content-manifest.jsonl'),
  assetRows: await readJsonl('migration/phase9/assets-manifest.jsonl'),
  reviewRows: await readCsv('migration/phase9/manual-review.csv')
})

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/normalize-asset-inventory.mjs')) {
  const result = await loadAndNormalizeAssetInventory()
  console.log(JSON.stringify({ status: 'ok', ...result.metrics }, null, 2))
}
