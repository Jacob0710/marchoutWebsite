# Phase 13 completion report

Date: 2026-08-04 (Asia/Taipei)

## 1. Executive decision

The Phase 13 repository implementation is a **release candidate**. Repository-only evidence discovery, canonical schemas, deterministic normalization, count-domain reconciliation, asset classification, future sanitized export tooling, owner checklist, and synthetic tests are implemented. Phase 13 is not declared globally complete by this self-contained commit: required PR checks, protected merge, final-main synchronization, annotated tag creation, and remote hash verification remain external release gates and are authoritative after the report commit is immutable.

No production inventory or Wix recrawl was performed.

## 2. Phase 12 baseline

| Identity | Value |
| --- | --- |
| initial branch | `main` |
| initial `HEAD` | `fab912ca26cd26736203d3ce54a7f827cd2f0700` |
| initial `origin/main` | `fab912ca26cd26736203d3ce54a7f827cd2f0700` |
| Phase 12 tag object | `14a2f507fb955fd2294e53b5ef672aac3d8a0e7e` |
| Phase 12 peeled tag commit | `fab912ca26cd26736203d3ce54a7f827cd2f0700` |
| Phase 12 application release SHA | `f99e335b20b311d1c101a7ad60fe125ee045bdf0` |

The application release SHA is an ancestor of the later completion-evidence commit. The remote/local annotated tag objects and local/remote peeled commit were verified before modification.

## 3. Worktree governance

The tracked worktree was clean at baseline. The intentionally local untracked `outputs/phase-12-codex-handoff.md` was identified and excluded from authority, generation, staging, and release scope. No reset, rebase, force push, stash, tag movement, or cleanup command was used.

## 4. Evidence discovery

The deterministic locator indexes 102 tracked Phase 9–12 evidence files: 17 authoritative, 9 derived, and 76 informational. Every entry records type, path, format/schema, tracking status, bytes, SHA-256, source phase, authority, and sensitivity flag. Sensitive-data findings are zero.

Authoritative inputs include Phase 9 source/content/asset/rollback/static/review/redirect/snapshot manifests, Phase 10 owner decisions, Phase 9–10 migrations, and verification SQL. Phase 13 outputs never overwrite these inputs.

## 5. Schema versions

All canonical schemas are version 1 and reject additional properties:

- `schemas/phase13/source-item.schema.json`
- `schemas/phase13/asset.schema.json`
- `schemas/phase13/inventory-summary.schema.json`
- `schemas/phase13/production-export.schema.json`

Four valid and three invalid fixtures exercise successful validation, unknown enum rejection, unknown/secret-like field rejection, and signed URL rejection.

## 6. Historical count domains

The following values are historical evidence baselines as of 2026-07-22. They are not current production state:

| Count domain | Value | Evidence |
| --- | ---: | --- |
| `source_inventory_items_total` | 526 | source inventory |
| `source_inventory_skip_items` | 70 | source inventory disposition |
| `imported_target_records_draft` | 70 | 46 Activities + 18 Files + 6 Year Summaries |
| `source_assets` | 398 | 147 image rows + 251 attachment rows |
| `source_unique_assets_total` | 397 | unique source keys |
| `storage_assignments_total` | 378 | asset manifest rows |
| `migrated_storage_objects` | 378 | historical private upload assignments |
| `owner_references_total` | 378 | assignment owner references |
| `publication_reviews_total` | 122 | publication review rows |
| `redirects_accepted_out_of_scope_total` | 52 | owner decision and deferred draft-target rows |

## 7. The two independent 70 values

`source_inventory_skip_items = 70` and `imported_target_records_draft = 70` remain different namespaces. Repository evidence does not establish row identity or one-to-one correspondence, so their relationship is explicitly `unresolved`.

## 8. Asset relationship reconciliation

The authoritative manifests resolve to:

- 398 source asset inventory rows;
- 397 source-unique keys;
- 371 `migrate` source rows covering 370 assigned unique keys;
- 27 `skip`/unassigned source-unique keys;
- 378 Storage assignments and 378 owner references;
- eight same-source multi-assignment groups and eight additional assignments;
- 405 canonical asset relationship records (378 assigned + 27 source-only accepted-skip).

The Phase 9 narrative report's 28 unassigned claim results from subtracting 370 unique assigned hashes from 398 inventory rows. The manifest has 27 `skip` asset rows because one assigned hash/key occurs under two distinct source URLs. Phase 13 records the discrepancy and uses manifest parsing; it does not rewrite historical evidence.

The 398/378 difference is not a claim of 20 missing assets.

## 9. Classification and owner review

Inventory-row source kind counts are 147 images and 251 documents; unique-source counts are 147 images and 250 documents. Relationship roles are 44 cover, 80 gallery, 236 attachment, 18 download, and 27 unknown. Owner relationships are 360 Activity, 18 File, and 27 unresolved/accepted-skip.

All 405 canonical relationship rows have source hashes. The 378 assigned rows have target bucket and database reference evidence. The 27 source-only rows remain owner-review checkpoints. The owner CSV contains blank `reviewDecision`, `ownerComment`, `verifiedAt`, and `verifiedBy` fields; no owner approval is fabricated.

## 10. Missing and unresolved evidence

`missing_evidence_total = 0` means every canonical row has repository source evidence. It does not mean production was inventoried. There are 28 explicitly unresolved relationship units: one cross-domain relationship between the two 70 counts, plus 27 accepted-skip asset owner/Storage relationships deferred to Phase 14.

## 11. Accepted decisions

- Production inventory is deferred to Phase 14.
- The 52 legacy redirects are `accepted_out_of_scope` and are not blockers.
- Wix remains available pending owner acceptance and later cutover decision.
- Draft content remains private until explicit owner approval.
- Production UAT will use a disposable Activity followed by one real retained Activity.
- Historical report values are not current production truth.

## 12. Deterministic normalization

Generated outputs use stable ordering, UTF-8/LF, no current timestamp identity, source hashes, strict schema validation, and a second-run hash comparison. Authoritative Phase 9–12 evidence remains unchanged.

Derived artifacts:

- evidence index JSON/Markdown;
- 526-row canonical source output;
- historical offline baseline and 448 comparison fingerprints;
- 405-row asset classification JSON/CSV;
- asset gap report.

Second-run SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| evidence index JSON | `d0b86b083a4cfe9c9822a29ae7292b111704f6bf83647245a49c6953f4bf6845` |
| evidence index Markdown | `ccb981a13e6926139997ed5cd505c01a47495eaccb6ab1f1819fff06d65679df` |
| normalized source items | `908d779a0b552f87766da3aa468e9e7f9ec8954592c3c8d918a8e0ab3cf928f3` |
| offline baseline | `62cfdbca5ad55f8b93f1aaabc3071d534750e59582bd0b938ed1e0da9fd5aa1e` |
| asset classification JSON | `055bef251c3cfc16831451c207389f93f6595434742d59d298f6fd931e81872f` |
| asset owner-review CSV | `63621f2f1c746ab25c2fc19bc6de9adbb1de3a0c82102e73cc5dd38455101d62` |
| asset gap report | `7d9db3205a4b48f252ec7daa705e7ddc9e595ab0f835f6d6133f6f3103a7746a` |

## 13. Future production export adapter

The adapter accepts local JSON paths only. Missing input, URL input, URL values, unknown/secret-like fields, signed URLs, duplicate keys, and invalid enums fail closed. Output paths are redacted before schema validation and secret scan. Scripts contain no HTTP import, `fetch`, SQL execution, Supabase SDK, credential loading, authentication, or mutation path.

Synthetic comparison covers one matched, one missing, one extra, and one changed record. Synthetic output is not represented as production evidence.

## 14. Owner pre-launch checklist and Phase 14 handoff

`docs/prelaunch-content-asset-verification.md` is marked `DO NOT EXECUTE DURING PHASE 13` and `OWNER CHECKPOINT — EXECUTE BEFORE PUBLIC LAUNCH`. It covers authorization, release identity, safe export storage, local normalization/comparison, 70-draft and 70-skip independent reviews, 398/397/378 asset domains, unknown/private handling, Wix retention, owner signature, and controlled UAT.

Phase 14 is responsible for production read-only reconciliation, owner review, administrator UAT, and public launch. Phase 13 does not claim all Wix assets are verified in production.

## 15. Security and privacy

- Future production exports are ignored under `.private/phase14-production-export/`.
- No real export, raw Wix media, attachment body, private filename, signed URL, session state, or credential is tracked.
- Evidence index sensitive findings: 0.
- Generated-output secret/signature findings: 0.
- Network/SQL/Supabase execution paths in Phase 13 scripts: 0.
- Phase 12 architecture, RLS, private Storage, staging isolation, CI permissions, and exact-SHA release gates are unchanged.

## 16. Verification ledger

| Check | Result |
| --- | --- |
| frozen install | PASS |
| Phase 12 repository verifier | PASS |
| Phase 13 schema fixtures | PASS (7) |
| Phase 13 tests | PASS (12) |
| evidence discovery | PASS (102 entries, 0 sensitive) |
| deterministic normalization | PASS |
| Phase 13 verifier | PASS; 26 required files, 7 deterministic outputs, Phase 12 regression OK |
| lint | PASS; 0 warnings/errors |
| production dependency audit | PASS; 0 known vulnerabilities |
| unit/component coverage | PASS; 29/29; 92.61% statements, 89.72% branches, 100% functions, 96.66% lines |
| application coverage | PASS; 10/10; 94.68% statements, 91.58% branches, 97.67% functions, 96.57% lines |
| typecheck | PASS |
| Phase 10 static/privacy/redirect regression | PASS |
| build | PASS |
| local SSR integration | PASS; 11 endpoints |
| local Chromium E2E final run | PASS; 21 passed, 6 expected environment-dependent skips, 0 failed |
| final E2E artifact scan | PASS; 3 files, 595,677 bytes, 0 secret findings |
| `git diff --check` | PASS |

The first local Chromium attempt observed one non-repeating browser-level `compute-pressure` Permissions Policy console message on the home page. The unchanged command was rerun once and completed with zero failures. No console assertion or security policy was relaxed; exact-head CI must independently pass before merge.

## 17. Known limits

- No production record/object was inventoried in Phase 13.
- No owner review/signature was completed in Phase 13.
- The source inventory cannot prove that the two 70-count domains correspond.
- The Phase 9 report/manifests have the documented 28-versus-27 unassigned discrepancy.
- Wix cutover timing remains undecided.
- Comparison fingerprints require a future owner-authorized sanitized export.

## 18. Release identity rule

This report cannot embed the SHA of the commit that contains itself. The protected merge commit, PR checks, final `main`, and annotated tag are authoritative external records. Phase 13 is globally `COMPLETE` only when:

```text
main = origin/main = phase-13-content-asset-reconciliation-prep-complete^{}
tracked worktree = clean
```

The release must use a normal protected PR merge with no admin bypass or required-check downgrade, followed by annotated tag push and remote hash verification.

## 19. Production access confirmation

```text
productionQueries = 0
productionAuthenticatedSessions = 0
productionMutations = 0
liveWixRecrawls = 0
```
