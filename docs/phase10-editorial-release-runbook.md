# Phase 10 editorial and release runbook

Phase 10 controls only the 70 Wix-imported Phase 9 drafts identified by `content_source_refs`. It must not absorb the one pre-existing Activity draft. A target may be published only from item-specific evidence; batch size or release goals never override a failed gate.

## Fixed reconciliation

- imported targets: 46 Activities, 18 Files, 6 Year Summaries;
- reviews: 122 total, including 40 high severity and 52 redirect reviews;
- redirects: 29 structural candidates, 52 draft-target mappings, 2 utility archives;
- private originals: 378 references and objects, 120,109,005 bytes at the Phase 9 checkpoint;
- conservative baseline: 0 publish, 70 keep-draft, 81 keep-inactive, 2 archive, 0 active redirect.

The canonical decision manifests are `migration/phase10/editorial-decisions.json` and `migration/phase10/redirect-decisions.json`. Regenerate them with `pnpm phase10:decisions` and require a zero diff before use.

## Per-item review evidence

The reviewer must inspect the actual target and record all of the following against the current target version:

- content correctness: title, date/year, body, category, links, files, and source match;
- privacy: names, student identifiers, phone/email/address, faces, GPS/EXIF, document metadata, comments, revisions, annotations, layers, embedded files, forms, and hidden package content;
- authorization: a named basis for public use of text, imagery, and documents;
- decision reason: specific to the item, not a batch-wide placeholder;
- reviewer identity and decision timestamp.

Publication requires a resolved `publish` review and true content, privacy, and authorization flags on both the review and target. Stale target versions fail. Missing or ambiguous evidence results in `deferred` plus `keep-draft`.

For managed Activities, the guarded version includes the parent row plus its asset/video cardinality and latest child update. For Year Summaries it also includes the linked report-file identity, status, and version. Editing any of those inputs after review therefore invalidates the recorded version. Database triggers reject direct managed-target deletion, direct publication transitions, edits while published, and changes to immutable Phase 9 original metadata; use the reviewed release/unpublish RPCs and the narrow delete assertions exposed through the server API.

## Redacted derivatives

Never overwrite an original. Originals stay in private Storage and preserve their original hash/path.

1. Download the original through the active-admin proxy.
2. Redact offline with an approved method. DOCX must be flattened to a reviewed PDF; image/PDF outputs must contain no prohibited metadata or interactive/embedded structures.
3. Visually inspect every page/frame and extract searchable text where applicable.
4. Upload through the editorial derivative endpoint with original and derivative SHA-256, safe MIME/name/size, redaction method, and a non-sensitive inspection summary.
5. Confirm derivative path and hash differ from the original and that only the active derivative can be served publicly.
6. Re-run privacy fixtures and anonymous asset/download tests. Automated structural inspection is necessary but never substitutes for human privacy and authorization review.

If any check is uncertain, revoke or omit the derivative and keep the target draft.

## Bootstrap and conservative decisions

All commands require the Phase 10 schema and a running application. Dry-runs perform no mutation.

```text
pnpm phase10:bootstrap:dry-run
pnpm phase10:decisions:dry-run
```

After the backup/restore evidence variables are present and independently reviewed:

```text
pnpm phase10:bootstrap:apply
node scripts/phase10/apply-conservative-decisions.mjs --mode=apply --max-items=25
node scripts/phase10/apply-conservative-decisions.mjs --mode=resume --max-items=25 --all
node scripts/phase10/apply-conservative-decisions.mjs --mode=second-apply
```

Each apply writes its checkpoint only beneath ignored `.phase10-cache/`. A mismatch in provenance, counts, target status/version, object hash, review mapping, or evidence blocks the transaction.

## Release batches

Release manifests are explicit, reviewed JSON that conforms to `migration/phase10/release-manifest.schema.json`. They list each source key, target kind/id, review keys, expected target version, and eligible redirect keys. The runner never infers “all drafts.”

For an approved manifest inside the repository:

```text
node scripts/phase10/release-batch.mjs --mode=dry-run --manifest=<manifest>
node scripts/phase10/release-batch.mjs --mode=apply --manifest=<manifest> --max-items=10
node scripts/phase10/release-batch.mjs --mode=resume --manifest=<manifest> --max-items=10
node scripts/phase10/release-batch.mjs --mode=verify --manifest=<manifest>
node scripts/phase10/release-batch.mjs --mode=second-apply --manifest=<manifest>
```

The checkpoint token rotates after every chunk. Never reuse a stale token or edit an in-flight manifest. Verification must prove published state, `published_at`, exact post-version, resolved gates, safe asset state, and audit records. Only then may individually listed redirects receive HTTP evidence and activation.

Dry-run may be executed only with an explicit `local`, `staging`, or `production` environment and proves zero database/Storage mutation. Apply is accepted only for `staging` or `production`, and its safety checkpoint must name that same environment. A manifest must list every draft-target redirect linked to each source; omission is a hard failure. Each item is version-checked again immediately before its transition.

An anticipated item failure is committed as a stable failed-item/batch checkpoint after all earlier successful items have been recorded. No later item is attempted, and a failed batch cannot be resumed as though the failed item succeeded. Preserve the returned token/code, inspect the exact item, and roll back the batch; rollback restores only applied items and marks failed/pending items cancelled. Repeating verify, apply-after-completion, or rollback must not duplicate audit rows or change publication timestamps.

## Stop conditions

Stop the affected operation and preserve evidence when:

- the 70 imported targets cannot be distinguished from the existing Activity draft;
- a review, source ref, asset, redirect key, or target version is missing or duplicated;
- content, privacy, authorization, or public-target evidence is incomplete;
- a sensitive original is publicly readable or a derivative could overwrite it;
- any target is not a direct public `200` at the approved origin;
- backup/restore evidence, active-admin authority, or same-origin protection is absent;
- apply is non-idempotent, checkpoint/resume diverges, or rollback cannot reconcile.

Use `docs/phase10-rollback-runbook.md` for recovery. Do not manually patch private tables or bypass the RPC gates.
