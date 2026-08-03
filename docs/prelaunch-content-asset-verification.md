# Pre-launch content and asset verification

> **DO NOT EXECUTE DURING PHASE 13**
>
> **OWNER CHECKPOINT — EXECUTE BEFORE PUBLIC LAUNCH**

This checklist is for Phase 14 after the repository owner explicitly authorizes a production read-only inventory. It does not authorize production mutation, publication, deletion, migration, or Wix cutover.

## 1. Authorization and release identity

1. Record the owner's written authorization for a read-only inventory and the permitted operator/window.
2. Confirm the protected `main` release SHA and the Phase 13 completion tag locally and remotely.
3. Stop if the deployed release marker, approved SHA, `origin/main`, or completion tag differs.
4. Confirm the operation uses read-only export paths and no content/Storage mutation endpoint.

## 2. Obtain sanitized inventories without mutation

1. Export content metadata needed to identify Activities, Files, Year Summaries, status, migration key, source hash, and database reference key.
2. Export private Storage object metadata needed to identify bucket, redacted object relationship, source hash, and database reference. Do not download object bodies unless separately authorized.
3. Exclude full private filenames, personal data, signed links, session values, credentials, cookies, and attachment bodies.
4. Save raw operator exports only below `.private/phase14-production-export/`; this directory is ignored by Git.
5. Never place production exports in `outputs/`, tests, GitHub artifacts, PR comments, issues, or commits.

## 3. Normalize locally

Use a local path, never a URL:

```bash
pnpm phase13:normalize-production-export -- \
  --input .private/phase14-production-export/<LOCAL_INPUT>.json \
  --output .private/phase14-production-export/<SANITIZED_OUTPUT>.json
```

The adapter must fail for missing input, URL input/values, unknown or secret-like fields, duplicate record keys, invalid enum values, or output that is not sanitized.

## 4. Compare with the repository baseline

```bash
pnpm phase13:compare-production-export -- \
  --baseline outputs/phase-13-offline-baseline.json \
  --production .private/phase14-production-export/<SANITIZED_OUTPUT>.json \
  --output .private/phase14-production-export/<COMPARISON>.json
```

Treat missing, extra, and changed rows as review evidence, not automatic defects. The repository baseline is historical and may legitimately differ from current production.

## 5. Owner review sequence

1. Copy the Phase 13 owner-review CSV to the ignored private working directory.
2. Confirm all 46 imported draft Activities, 18 imported draft Files, and 6 imported draft Year Summaries independently (`imported_target_records_draft = 70`).
3. Review the independent `source_inventory_skip_items = 70` domain. Do not assume those rows correspond to the 70 drafts.
4. Review all 398 source asset inventory rows and their 397 unique source keys.
5. Confirm all 378 historical Storage assignments and owner references using sanitized metadata.
6. Review the 27 source-unique accepted-skip assets. Classify each as decoration, utility, duplicate, retained content, private content, missing evidence, or another explicit owner decision.
7. Review all eight same-source multi-assignment groups without collapsing valid owner relationships.
8. For unknown/missing evidence, stop publication of the affected item until resolved.
9. For private/personal data, keep the item private and record required redaction or legal/editorial handling.
10. Fill `reviewDecision`, `ownerComment`, `verifiedAt`, and `verifiedBy` only after actual inspection. Phase 13 left these fields blank intentionally.

## 6. Wix safety checkpoint

1. Confirm no necessary content or asset exists only on Wix.
2. Confirm all retained content has an approved new-site owner and publication decision.
3. Keep Wix available until owner acceptance is signed and a separate cutover decision is approved.
4. Do not activate the 52 legacy redirects; they are accepted out of scope.

## 7. Production UAT

Only after read-only reconciliation and separate authorization:

1. Create one disposable test Activity, exercise the approved administrator journey, and delete it with evidence of zero residual objects.
2. Create one real retained Activity and complete desktop/mobile review.
3. Confirm draft/private boundaries and owner acceptance before public launch.

## 8. Final owner acceptance

Record the approved release SHA, sanitized export hashes, comparison result hash, reviewed-row totals, unresolved exceptions, Wix decision, UAT evidence, owner name, acceptance time, and explicit launch decision. An unsigned or partially reviewed sheet is not acceptance.
