# Phase 14 — Pre-launch verification, UAT, and cutover governance

## Background and baseline

Phase 14 begins from Phase 13 merge `598882e371a01c832832d7141acec918143c133c`. The annotated tag `phase-13-content-asset-reconciliation-prep-complete` has tag object `2ed33151596e5605059771283f00700a1d2b62eb` and peels to that merge. Phase 13 supplies historical repository evidence and offline reconciliation inputs; it does not describe current production state.

Historical count domains remain independent: `source_inventory_skip_items=70`, `imported_target_records_draft=70`, `source_assets=398`, `source_unique_assets_total=397`, `migrated_storage_objects=378`, `storage_assignments_total=378`, `owner_references_total=378`, `publication_reviews_total=122`, and `redirects_accepted_out_of_scope_total=52`. The asset relationship model has 370 assigned unique sources, 27 accepted-skip/unassigned unique sources, eight multiple-assignment groups, and 405 canonical relationships. The Phase 9 narrative count 28 and manifest count 27 remain unresolved evidence, not a correction target.

## Objective

Before public launch, obtain an owner-authorized sanitized production read-only inventory, reconcile it with Phase 13, complete 405-row human owner review, conduct administrator UAT, and prepare an explicit Wix/redirect/cutover decision. No production mutation occurs without a separate authorization.

## Scope

Gate 1 includes repository baseline verification, versioned schemas, synthetic fixtures, local-only normalization and reconciliation, resumable owner-review tooling, discrepancy governance, UAT/cutover/rollback plans, authorization checks, security scanning, deterministic evidence, tests, CI, and a Draft PR.

Gate 1 excludes production authentication/querying, production CLI linking/dumps, Storage listing/downloads, production browser sessions, live Wix crawling, owner decisions/signatures, UAT execution, redirect activation, DNS/domain changes, publication, Storage/database mutation, PR merge, and a Phase 14 completion tag.

## Authorization gates

1. **Gate 1 — repository/offline readiness:** autonomous repository work; completion does not complete Phase 14.
2. **Gate 2 — production read-only inventory:** requires a bounded, expiring owner authorization artifact. Only allowlisted metadata reads and sanitized export are permitted.
3. **Gate 3 — owner review and admin UAT:** human owner/administrator execution. Automation may validate and preserve entries but cannot create identity, dates, decisions, evidence claims, or sign-off.
4. **Gate 4 — cutover/production mutation:** separate explicit mutation authorization, go/no-go approval, rollback operator, and evidence checkpoint are mandatory.

## Production safety restrictions

Gate 1 executable code accepts repository-local JSON/CSV paths only and rejects URLs, database URLs, traversal, secret-like fields, network libraries, `fetch`, Supabase client initialization, and sockets. It contains no credential loader or production address. Real exports and authorization artifacts live under ignored `.private/` paths; errors and tracked outputs remain sanitized. CI has no production credentials and performs no production/Wix request.

## Production inventory flow

1. Owner defines exact read-only scope and validity boundary using the authorization schema.
2. An authorized human injects a least-privilege credential into one local process outside Git/history/logs.
3. `phase14:authorization-check` must return `authorized-readonly`; otherwise execution stops without network.
4. An external owner-approved exporter gathers only allowlisted metadata from current repository-defined domains: activities, activity images/assets/videos, posts, files, categories, FAQ, year summaries, site settings, editorial targets/redirects, private buckets, Storage objects, relationships, and hashed redirect paths.
5. Save the raw sanitized result only under `.private/phase14-production-export/`.
6. Normalize and validate via a repository-local input path, scan secrets, compare to the historical baseline, and retain hashes/evidence.
7. Treat every difference as evidence for review, never as automatic publication or mutation authority.

## Owner review flow

The immutable starting input is `outputs/phase-13-asset-classification.csv`. The generator produces 405 stable rows with an audit fingerprint and blank human fields. Validation enforces decision/reviewer/time/evidence/notes dependencies. Regeneration preserves manual fields; source fingerprint changes or competing human values produce an explicit conflict. Merge audit records hashes and changed-field value hashes without exposing note content. Unknown/conflict rows cannot be approved automatically.

## Administrator UAT flow

After Gate 2 inventory and owner spot-check selection, an authorized administrator executes the checklist in an isolated approved environment. It covers authentication/session boundaries, CRUD/draft/publish/unpublish, private assets/proxies, upload constraints, public/draft visibility, mobile/browsers, errors/idempotence, personal-data review, evidence capture, and rollback readiness. Automation never marks a result or sign-off.

## Wix, redirects, cutover, and rollback

The 52 accepted-out-of-scope redirect decisions remain historical policy until the owner decides otherwise. Pre-activation checks cover hashed source identity, exact destinations, loops/chains/duplicates, status, slash/query/encoding/fragment/file semantics, legacy Wix dependencies, SEO, DNS, evidence retention, operator assignment, and rollback. Wix remains available until explicit retain/archive/disable criteria are signed. Cutover is no-go on unresolved blockers, failed UAT, missing backup/restore evidence, absent mutation authorization, or unavailable rollback operator.

## Evidence contract

Tracked outputs must be UTF-8/LF, deterministically sorted, schema-versioned, secret-free, and free of volatile runtime identity. Evidence identifies source path/hash, count domain, record/relationship identity, classification reason, automated/manual boundary, and duplicate versus unique statistics. Production evidence must be distinguished from historical or fixture evidence. The Phase 12 handoff stays untracked and unchanged.

## Test and CI matrix

- Schemas: valid fixture; version, relationship, sensitive-field, authorization, expiry, and mutation-scope rejection.
- Reconciliation: match, both one-sided cases, metadata/publication/relationship/checksum mismatch, duplicates, multiple assignment, accepted skip, discrepancy, owner review, ordering, stable IDs/hashes.
- Owner review: blank/preserved human fields, validation dependencies, conflicts, CSV/Unicode, fingerprints, merge audit.
- Network safety: URL/database/traversal/environment rejection; Supabase/fetch/socket detection; missing authorization fail-closed.
- Regression: frozen install, Phase 10, Phase 12, Phase 13, lint, coverage, application, typecheck, build, local SSR, Chromium, artifact scan, production dependency audit, and `git diff --check`.

CI runs only offline/synthetic Phase 14 commands. It cannot receive production credentials, connect to production/Wix, execute UAT/cutover, or use owner sign-off.

## Definition of Done

These milestones are separate and cannot be collapsed:

- **Gate 1 readiness complete:** repository tooling/docs/tests/CI/Draft PR are green; all safety counters zero.
- **Production read-only inventory complete:** valid owner authorization, sanitized current export, reconciliation, and evidence are complete.
- **Owner review complete:** every required row has valid human evidence/decision and resolved conflicts.
- **Admin UAT complete:** human checklist and evidence are signed, with failures resolved or accepted explicitly.
- **Cutover decision complete:** Wix/redirect/DNS/go-no-go/rollback responsibilities are signed.
- **Production mutation authorized:** separate bounded authorization covers only approved actions.
- **Final Phase 14 complete:** authorized cutover, verification, rollback readiness, protected PR merge, synchronized main/remote/tag, and completion evidence all pass.

## Stop conditions and human approvals

Stop on baseline/tag drift, unknown tracked edits, missing/invalid/expired authorization, secret or network-path finding, schema failure, non-determinism, count-domain collapse, changed Phase 13 authority, owner-review conflict, unresolved UAT blocker, absent rollback operator, or any request exceeding the approved operation list. Human approval is required at Gate 2 authorization, every owner decision, UAT result/sign-off, discrepancy resolution, redirect/Wix/go-no-go decision, mutation authorization, final merge, and tag creation.

## Final merge and tag conditions

The Gate 1 Draft PR must not be merged. No Phase 14 completion tag may exist. Final merge/tag requires all later gates, protected required checks, explicit owner go decision, zero unexplained secret/security findings, exact post-merge `main=origin/main=remote main`, and an annotated tag peeled to that final merge.
