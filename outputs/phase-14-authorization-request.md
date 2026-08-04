# Phase 14 Gate 2 production read-only authorization request

## Requested scope

Authorize one bounded local session to read allowlisted production metadata and create a sanitized inventory for: activities; activity images/assets/videos; posts; files; categories; FAQ; year summaries; site settings; editorial targets/redirects; private Storage bucket metadata; Storage object metadata; content-to-asset relationships; and hashed redirect source/target paths.

Approved operations requested: `select-content-metadata`, `list-storage-metadata`, `select-editorial-metadata`, and `export-sanitized-inventory`. The authorization must identify the human authorizer, start/expiry boundary, evidence output path, and all prohibited operations using `schemas/phase14/production-readonly-authorization.v1.schema.json`.

## Explicit exclusions

No insert/update/delete, upload/move/download, publish/unpublish, Auth Admin operation, signed URL creation, content/body extraction beyond the allowlist, redirect activation, Wix recrawl, DNS/domain change, browser session, cutover, or rollback is requested. The session must not mutate production or Wix.

## Credential class and handling

Use a least-privilege credential capable only of the approved metadata reads. Do not send a credential in chat, email, PR comments, screenshots, command arguments, shell history, repository files, logs, CI secrets, or artifacts. Do not use a service-role key or database owner password when a narrower read-only identity is available.

An authorized human should inject the value into the environment of one local process using an OS secret prompt/manager or equivalent no-history mechanism, run the external owner-approved exporter, then close the process and remove/revoke the credential. Store the authorization and sanitized export only below ignored `.private/` paths. Never use `setx`, a committed `.env`, clipboard screenshots, or a command containing the secret literal.

## Expected sanitized evidence

Expected output is one version 1 JSON inventory with stable IDs, allowlisted status/visibility/fingerprints, redacted object paths, checksums where permitted, relationship identities, and hashed redirect paths. It must contain no token, password, cookie, JWT, database URL, full private signed URL, or unnecessary personal data. Local normalization, schema validation, secret scan, reconciliation, and output hashes follow collection.

## Post-session verification and revocation

Verify the authorization had not expired, every operation was in scope, no mutation/audit event occurred, counters remain read-only, output is under `.private/`, tracked worktree has no secret/export, and logs/screenshots are sanitized. Revoke the credential or end its bounded session immediately; record revocation evidence outside Git if it contains identity or sensitive metadata.

## Exact approval requested

Approve **Phase 14 Gate 2 production read-only inventory only**, for the four named operations, the listed domains, one local bounded session, sanitized metadata output, and no mutation. Gate 3 owner decisions/UAT and Gate 4 cutover remain separately unauthorized.

If authorization is declined, repository tests, fixture dry runs, documentation review, and checklist refinement may continue, but production inventory, current-state claims, owner resolution, UAT completion, and cutover cannot proceed.
