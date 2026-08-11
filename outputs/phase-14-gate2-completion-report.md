# Phase 14 Gate 2 production read-only inventory completion report

## Outcome

Gate 2 is complete under the owner's explicit production read-only authorization. The execution stopped at the owner review and admin UAT human gate. Phase 14 remains **IN PROGRESS**; this report is not owner acceptance, admin UAT, launch approval, production mutation authorization, cutover completion, PR merge approval, or a Phase 14 completion tag.

The production identity matched the owner-controlled GitHub `Production` environment configuration. The latest successful production deployment evidence resolves to application release SHA `f99e335b20b311d1c101a7ad60fe125ee045bdf0`.

## Safety boundary

- Content and editorial reads used an authenticated, non-persistent admin session with an explicit network allowlist.
- Bucket policy metadata used a fixed three-row `SELECT` after `default_transaction_read_only=on` and inside `BEGIN READ ONLY`.
- Storage collection used metadata listing only. Object downloads, signed URLs, uploads, moves, and deletes were 0.
- All real row-level evidence remains under ignored `.private/phase14-production-export/`.
- Credentials, access/refresh tokens, cookies, database URLs, project URL/ref, private object paths, and content bodies were not written to Git, reports, logs, PR artifacts, or CI.
- All network methods/paths outside the allowlist failed closed. Production mutations, live Wix recrawls, redirect activation, DNS/domain/cutover actions, owner signatures, and admin UAT executions were 0.

Two read-only preflights failed closed: the authenticated Storage API cannot read bucket policy rows, and PostgREST does not expose the `storage` schema. No object listing or mutation occurred through either rejected path. A first database connection rejected its startup read-only assertion after one `SHOW`; the successful retry explicitly set session read-only before the fixed bucket `SELECT`. The conservative cumulative counters include these read-only attempts: 331 production metadata queries, 5 authenticated production sessions/connections, and 333 production network paths/connections.

## Current production read-only inventory

These are current Gate 2 production metadata counts, not historical report claims:

| Domain | Current production count |
| --- | ---: |
| activities | 50 |
| activity assets | 360 |
| files | 18 |
| year summaries | 6 |
| site settings | 1 |
| editorial targets | 70 |
| editorial reviews | 122 |
| editorial redirects | 83 |
| private Storage objects | 378 |
| `activity-assets` objects | 360 |
| `content-assets` objects | 0 |
| `downloads` objects | 18 |

Current production also contains 0 legacy activity images, 0 activity videos, 0 posts, 0 categories, and 0 FAQ rows. Of the 70 imported targets, 70 are currently draft and 0 are published. Redirect decisions are 81 `keep-inactive`, 2 `archive`, and 0 `activate`; Gate 2 did not activate redirects.

## Count-domain reconciliation

The following historical repository values remain evidence baselines only:

- `source_inventory_skip_items = 70`
- `imported_target_records_draft = 70`
- `source_assets = 398`
- `migrated_storage_objects = 378`

The two values of 70 remain different domains: source skip dispositions versus imported target records. The 70 current production draft targets were matched by stable target identities and fingerprints, not accepted because the totals happen to be equal.

The values 398 and 378 also remain different domains: historical Wix/source asset inventory rows versus migrated private Storage assignments. No subtraction between them is interpreted as a missing-asset count. The 378 current production objects were instead matched one-by-one to 378 Phase 13 assignment identities; their database references, recorded checksums, database sizes, manifest sizes, and live Storage metadata sizes all agreed. Binary objects were not downloaded, so no claim is made that Gate 2 recomputed 378 binary hashes.

## Reconciliation result

The row-level reconciliation produced 1,021 rows:

- `matched`: 826 = 70 imported targets + 378 Storage objects + 378 assignment relationships
- `accepted_skip`: 27, preserved for owner confirmation
- `production_only`: 158 current content/editorial records without a Phase 13 comparison row
- `requires_owner_review`: 9 = 8 known multiple-assignment source groups + 1 non-applicable/unknown visibility classification
- `evidence_discrepancy`: 1, preserving the Phase 9 narrative 28 versus authoritative manifest 27 issue
- `offline_only`, `metadata_mismatch`, `publication_state_mismatch`, `relationship_mismatch`, `asset_identity_mismatch`, `invalid_input`, and `blocked_sensitive_data`: 0

`production_only` is not automatically an error or approval. It is routed to human review because the Phase 13 comparison baseline intentionally covered imported targets and asset assignments, not every live editorial/support record.

## Validation and evidence

- authorization schema: valid
- production inventory schema: valid
- normalized inventory deterministic verification: 3 identical runs
- reconciliation deterministic verification: 3 identical runs
- secret findings: 0
- URL findings in sanitized inventory: 0
- normalized inventory SHA-256: `345db36fda912e89fb65282ef2d89c4eb9d1a989207edfe401cfdbb238a6ed65`
- reconciliation SHA-256: `bef35bafce931e6d163a2a649830aef1c80e858c92ac807a9088d3c3c72d16d4`

The private evidence hashes and sizes are recorded in `outputs/phase-14-gate2-evidence-index.md`. The existing 405-row owner review working copy remains unsigned; no human decision, reviewer, timestamp, or owner comment was filled by automation.

## Required human continuation

The owner must now review the 27 accepted-skip rows, 8 multiple-assignment groups, the 1 evidence discrepancy, the 158 production-only metadata rows, and all other owner-review checklist items. An administrator must execute the prepared UAT checklist and capture sanitized evidence. Until both human gates are complete, Gate 4 remains not authorized: no production mutation, publication, asset move/upload/delete, redirect activation, Wix action, DNS/domain/cutover action, PR merge, or Phase 14 completion tag may occur.

Stop point: **PHASE 14 OWNER REVIEW AND ADMIN UAT HUMAN EXECUTION GATE**.
