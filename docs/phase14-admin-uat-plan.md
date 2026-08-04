# Phase 14 administrator UAT plan

Status: **PREPARED; NOT EXECUTED**. An authorized administrator and owner must conduct UAT after Gate 2 evidence is available. Automation cannot claim results.

## Preconditions and roles

- Owner: selects content spot checks, reviews personal/sensitive content, accepts business results, signs go/no-go.
- Administrator tester: executes cases with an approved account/environment and records evidence.
- Observer/evidence custodian: redacts and retains screenshots/logs without credentials/private URLs.
- Rollback operator: confirms checkpoint and rollback readiness; does not combine this with an unauthorized production action.

Preconditions: exact release, approved environment, explicit UAT scope, valid test data, backup/restore evidence, production read-only reconciliation, owner review candidates, secure evidence location, rollback operator, and no unresolved security blocker.

## Test coverage

1. Login success/failure, session persistence/expiry/logout, anonymous and inactive/non-admin rejection.
2. Create Activity, save/edit draft, publish/unpublish, duplicate submit handling, and error recovery.
3. Upload image/attachment, set/replace/remove cover, reorder images, download file, add external video.
4. Large/empty/unsupported file rejection and safe error messages.
5. Public list/detail display, draft `404`/non-disclosure, private asset proxy, cache/content headers.
6. Mobile viewport, keyboard/accessibility, Chromium plus repository-required browser compatibility.
7. Owner-confirmed content spot checks and personal/sensitive-data/redaction review.
8. Audit evidence capture, cleanup plan, checkpoint identity, and rollback readiness.

Use one disposable Activity first and, only under separate mutation/UAT authority, one retained real Activity. Production mutations are not authorized by this plan or Gate 1.

## Evidence and pass criteria

Each case records case ID, environment/release SHA, tester, start/end time, input fixture key, expected/actual result, sanitized screenshot/log reference, issue ID, cleanup state, and pass/fail/block decision. Never capture password, cookie, JWT, signed URL, private filename/body, or raw database error.

Pass requires every critical case human-marked pass, no draft/private disclosure, no unresolved high-severity issue, cleanup verified, owner spot check signed, and rollback readiness confirmed. Any critical failure, privacy uncertainty, incorrect environment/release, missing evidence, or unavailable rollback operator is no-go.
