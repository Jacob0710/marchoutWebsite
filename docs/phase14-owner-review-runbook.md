# Phase 14 owner review runbook

Status: **HUMAN EXECUTION REQUIRED AFTER AUTHORIZED PRODUCTION INVENTORY**.

## Source and generation

`outputs/phase-13-asset-classification.csv` is immutable authority. `pnpm phase14:owner-review` generates `outputs/phase-14-owner-review-working.csv` with 405 stable rows. Automated fields carry canonical relationship/source evidence, current classification, proposal boundary, privacy/review status, and an audit fingerprint. Human fields are blank.

## Human fields and decisions

The owner may enter `ownerDecision`, `ownerNotes`, `reviewer`, `reviewedAt`, `evidenceChecked`, `followUpAction`, `resolutionStatus`, `uatRelevance`, and `cutoverBlocker`. Allowed decisions are `approved`, `accepted-skip`, `rejected`, `replace`, `remigrate`, and `defer`.

- A reviewer/date without a decision is invalid.
- A decision requires reviewer and UTC ISO `reviewedAt`.
- `approved`/`accepted-skip` requires `evidenceChecked=yes`.
- `rejected`/`replace`/`remigrate` requires notes.
- Unknown/conflict cannot count as approved.
- The reviewer must be a real human; tools never infer OS/Git identity or current time.

## Re-entry, resume, and merge

Regeneration uses stable IDs and preserves existing human fields when the source audit fingerprint is unchanged. It stops on a changed automated fingerprint with human data. Validate with `pnpm phase14:owner-review:validate -- --input <working.csv>`.

For parallel/offline edits, keep an authoritative base and merge explicitly:

```text
node scripts/phase14/owner-review.mjs --mode merge --base <base.csv> --incoming <incoming.csv> --output <merged.csv> --audit <merge-audit.json>
```

Competing nonblank values, fingerprint changes, or unknown incoming IDs produce a conflict report and no silent overwrite. Audit changes store field names and value hashes, not note contents.

## Review sequence

Review all 405 relationships, with focused checkpoints for 378 assigned rows, 27 accepted-skip rows, eight multiple-assignment groups, privacy `unknown`, checksum/relationship mismatch, orphans, and UAT/cutover blockers. Review `source_inventory_skip_items=70` separately from `imported_target_records_draft=70`; do not infer row correspondence. Keep P14-DISC-001 unresolved until human and authorized production evidence resolve it unambiguously.

Completion requires zero validation/conflict errors, every required human row decided with evidence, blocker ownership, discrepancy decision, and a separate owner sign-off outside automation.
