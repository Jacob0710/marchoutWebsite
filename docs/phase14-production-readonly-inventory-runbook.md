# Phase 14 production read-only inventory runbook

Status: **DO NOT EXECUTE WITHOUT AN EXPLICIT, VALID GATE 2 AUTHORIZATION**.

## Contract and domains

Use `schemas/phase14/production-inventory-export.v1.schema.json`. Repository migrations and application queries establish the required domains: activities, legacy activity images, activity assets, activity videos, posts, files, categories, FAQ, year summaries, singleton site settings, editorial targets/redirects, private `activity-assets`/`content-assets`/`downloads` buckets, Storage object metadata, relationships, and hashed redirect paths. Legacy bucket names are not assumed to be current production buckets.

The export allowlist contains stable record/migration/source identities, publication/visibility state, allowlisted metadata fingerprints, bucket policy metadata, redacted object paths, checksums/sizes where approved, relationship identity/role/ordinal, and redirect path hashes. It excludes content bodies not needed for reconciliation, personal identities, auth data, credentials, cookies, JWTs, database URLs, and signed URLs.

## Preflight

1. Confirm exact release SHA and production project identity through an owner-controlled channel.
2. Obtain a valid bounded artifact matching the authorization schema; keep it at `.private/phase14-production-readonly-authorization.json`.
3. Confirm approved operations and expiration; run `pnpm phase14:authorization-check`.
4. Stop unless status is `authorized-readonly`. The checker never connects.
5. Prepare `.private/phase14-production-export/`; confirm it is ignored and outside screenshots/artifacts.
6. Use a least-privilege read-only identity, injected into one process without command arguments or shell history.

## Authorized collection template

An owner-approved exporter outside this Gate 1 code may perform only the authorization's metadata selects/listings. It must sanitize and schema-shape locally before writing JSON. Never paste a production URL or credential into Phase 14 repository commands; the local adapter rejects them. Do not run Supabase link/dump, SQL consoles, authenticated application smoke, browser sessions, file downloads, signed URL creation, or Wix requests.

## Local normalization and comparison

```text
pnpm phase14:normalize-inventory -- --input .private/phase14-production-export/raw-sanitized.json --output .private/phase14-production-export/normalized.v1.json --authorization .private/phase14-production-readonly-authorization.json
pnpm phase14:reconcile -- --baseline <owner-approved-baseline> --inventory .private/phase14-production-export/normalized.v1.json --output .private/phase14-production-export/reconciliation.csv
```

All paths must stay inside the repository and be local. Retain input/output SHA-256, schema result, secret scan result, release SHA, authorization boundary, and revocation evidence. Do not copy a real export into tracked `outputs/`; tracked dry-run outputs are fixture-only.

## Interpretation and stop conditions

Classifications are `matched`, `production_only`, `offline_only`, `metadata_mismatch`, `publication_state_mismatch`, `relationship_mismatch`, `asset_identity_mismatch`, `accepted_skip`, `requires_owner_review`, `evidence_discrepancy`, `blocked_sensitive_data`, and `invalid_input`. They do not authorize a decision or mutation.

Stop on schema/secret/URL failure, authorization expiry, unexpected domain/table/bucket, operation outside the allowlist, inconsistent release identity, personal data outside the allowlist, network/credential leakage, or any sign of mutation. End/revoke the credential after export and verify tracked Git status contains no production artifact.
