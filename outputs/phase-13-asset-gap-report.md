# Phase 13 asset gap report

> Historical repository evidence only. This report is not a current production inventory.

## Count domains

- source_assets = 398
- source_unique_assets_total = 397
- migrated_storage_objects = 378
- storage_assignments_total = 378
- assigned_unique_source_objects_total = 370
- owner_references_total = 378
- canonical_asset_relationship_records_total = 405

The 398 source asset inventory rows, 397 source-unique keys, and 378 migrated Storage objects are different domains. The manifest has 378 assignments from 370 unique assigned sources, while 27 source-unique assets carry explicit accepted-skip evidence. One assigned source key appears twice in source inventory under distinct URLs, and eight source keys have more than one assignment. The Phase 9 narrative's arithmetic claim of 28 unassigned objects is retained as a documented report discrepancy, not substituted for authoritative manifest parsing. Therefore no "20 missing assets" claim is valid.

## Classification

- source asset inventory-row kinds: {
  "document": 251,
  "image": 147
}
- source unique asset kinds: {
  "document": 250,
  "image": 147
}
- relationship roles: {
  "attachment": 236,
  "cover": 44,
  "download": 18,
  "gallery": 80,
  "unknown": 27
}
- relationship owner kinds: {
  "activity": 360,
  "file": 18,
  "unresolved": 27
}
- relationship records with source hash: 405
- relationship records with target bucket evidence: 378
- relationship records with target database reference evidence: 378

## Phase 14 checkpoints

- Owner reviews all 27 accepted-skip source assets and confirms decoration, utility, duplicate, or retained-content disposition.
- Owner confirms every draft target and private asset against an authorized read-only sanitized production export.
- Empty CSV fields `reviewDecision`, `ownerComment`, `verifiedAt`, and `verifiedBy` remain unsigned in Phase 13.
- Wix remains available until owner acceptance and a later cutover decision.
