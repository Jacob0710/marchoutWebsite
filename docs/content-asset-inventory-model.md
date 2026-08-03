# Phase 13 content and asset inventory model

## Scope and authority

This model is a deterministic, repository-only view over committed Phase 9–12 evidence. It does not query production, log in to production, mutate production, or recrawl Wix. The Phase 9 manifests remain authoritative; every Phase 13 JSON/CSV/Markdown artifact is derived and can be regenerated.

All historical values below are evidenced as of the Phase 9 completion record dated 2026-07-22. They are not current production truth.

## Count domains

| Stable identifier | Value | Domain | Authoritative evidence |
| --- | ---: | --- | --- |
| `source_inventory_items_total` | 526 | source inventory rows | `migration/phase9/source-inventory.jsonl` |
| `source_inventory_skip_items` | 70 | source rows whose historical disposition is `skip` | `migration/phase9/source-inventory.jsonl` |
| `imported_target_records_draft` | 70 | created target records whose desired status is `draft` | `migration/phase9/content-manifest.jsonl` |
| `source_assets` | 398 | source inventory rows of kind image or attachment | `migration/phase9/source-inventory.jsonl` |
| `source_unique_assets_total` | 397 | unique historical source asset keys | `migration/phase9/source-inventory.jsonl` |
| `storage_assignments_total` | 378 | private upload assignment rows | `migration/phase9/assets-manifest.jsonl` |
| `migrated_storage_objects` | 378 | historical migrated private Storage object assignments | `migration/phase9/assets-manifest.jsonl` |
| `owner_references_total` | 378 | assignment rows with owner kind and migration key | `migration/phase9/assets-manifest.jsonl` |
| `publication_reviews_total` | 122 | publication review rows | `migration/phase9/manual-review.csv` |
| `redirects_accepted_out_of_scope_total` | 52 | deferred draft-target redirects accepted as not implemented | redirect manifest plus owner decision |

The two values of 70 are unrelated domains. Repository evidence does not prove a row-level relationship, so `relationship = unresolved`.

The values 398 and 378 are also unrelated domains. Subtracting them does not prove that 20 assets are missing. The authoritative relationship is:

- 398 source asset inventory rows;
- 397 unique source keys because one assigned hash/key occurs under two distinct source URLs;
- 371 source asset rows historically marked `migrate`, covering 370 unique assigned source keys;
- 27 source asset rows/unique keys historically marked `skip` with Wix chrome/background/decorative rationale;
- 378 Storage assignments from those 370 assigned unique source keys;
- eight source keys with a second assignment;
- 405 canonical asset relationship records: 378 assigned relationships plus 27 source-only accepted-skip relationships.

The Phase 9 narrative report states 28 unassigned objects. That number was produced by subtracting 370 unique assigned hashes from 398 inventory rows. The authoritative manifest instead has 27 `skip` asset rows. Phase 13 preserves this discrepancy and uses the parsed manifest values for derived relationships.

## Canonical source items

`schemas/phase13/source-item.schema.json` defines version 1. Each of the 526 inventory rows becomes a canonical item. A repeated historical `sourceKey` receives a deterministic URL-hash suffix in `sourceItemKey`; the historical key and provenance remain traceable in notes and evidence.

Normalized dispositions never overwrite historical dispositions. Draft status, review status, privacy status, owner kind, owner migration key, source hash, and evidence files remain separate fields. Unknown relationships use explicit `unresolved`/`null` values.

## Canonical asset relationships

`schemas/phase13/asset.schema.json` defines version 1. A canonical row represents either:

- a `source_unique_asset` with no assignment, or
- one `storage_assignment` plus its `owner_reference`.

One source may therefore produce multiple relationship rows. Such rows are not collapsed as duplicates. Source filenames are deterministically redacted in Phase 13 output; authoritative filename evidence remains only in the pre-existing Phase 9 manifest. Target paths are reduced to `<bucket>/<redacted>` and never contain signed parameters.

Supported source kinds are `image`, `document`, `logo`, and `unknown`. Supported roles are `cover`, `gallery`, `attachment`, `download`, `logo`, `content-image`, `document`, and `unknown`. Supported owner kinds and normalized dispositions are closed enums in the schema.

## Derived artifacts

- `outputs/phase-13-normalized-source-items.json`: canonical 526-row source view.
- `outputs/phase-13-asset-classification.json`: canonical relationship records and metrics.
- `outputs/phase-13-asset-classification.csv`: owner review queue; decision/signature fields remain blank.
- `outputs/phase-13-offline-baseline.json`: historical count domains, unresolved relationships, accepted decisions, warnings, and comparison fingerprints.
- `outputs/phase-13-asset-gap-report.md`: human-readable reconciliation and Phase 14 checkpoints.

## Phase 14 comparison contract

Phase 14 may provide an owner-authorized sanitized local export. The adapter rejects URL inputs, URL values, unknown/secret-like fields, duplicate keys, invalid enums, and unsanitized paths. Comparison produces missing, extra, changed, and matched evidence without approval, publication, or mutation semantics.
