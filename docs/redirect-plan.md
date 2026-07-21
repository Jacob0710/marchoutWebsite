# Phase 9 redirect plan

## Manifest result

`migration/phase9/url-redirects.csv` records all 83 authoritative Wix routes from snapshot `3a6a00b…ceb60`:

- 29 verified structural `301` candidates to existing public routes;
- 52 inactive candidates with `status_code=0` because their Activity or Year target is still draft;
- 2 Wix utility/archive routes with no target;
- 0 approved `410` responses, conflicts, loops, or chains.

The manifest is a deployment artifact, not an automatic runtime redirect configuration. Publication and redirect activation remain explicit production approvals.

## Mapping policy

- Home, About, Organization, Almanac, category, and finance index pages map only to durable public equivalents.
- Activity detail and year-summary paths retain the exact source path and intended local target, but remain inactive until that target is reviewed and published.
- Wix utility/popup paths are archived; no `410` is emitted without owner approval.
- Asset URLs are not redirected to private object paths or persisted signed URLs. Files remain available only through controlled proxies after publication.
- Encoded Chinese paths, canonical host/scheme/slash handling, source uniqueness, and target paths are preserved in the CSV.

## Activation checklist

Before enabling any row, verify the target is public and semantically equivalent, keep one canonical hop, test encoded/non-ASCII paths and trailing slashes, validate canonical tags, and sample desktop/mobile navigation. Re-crawl after deployment and retain a reversible redirect configuration. For each of the 52 deferred rows, editorial publication and personal-data review must complete first.
