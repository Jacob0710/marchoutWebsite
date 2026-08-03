# Project decisions

## Phase 13

### DECISION-P13-001 — Production inventory deferred

Production inventory is deferred to the pre-launch gate in Phase 14. Phase 13 uses repository evidence only.

### DECISION-P13-002 — Legacy redirects accepted out of scope

The 52 deferred/draft-target legacy redirects will not be implemented. They remain provenance evidence and are not a Phase 13 blocker.

### DECISION-P13-003 — Wix remains available

Wix remains available until owner acceptance and a later cutover decision. Phase 13 does not recrawl or take down Wix.

### DECISION-P13-004 — Draft content remains non-public

Draft content must remain non-public unless explicitly approved by the repository owner. Equal historical counts do not imply equal record identity.

### DECISION-P13-005 — Production UAT order

Production UAT will first use a disposable test Activity and then one real retained Activity. This occurs only in Phase 14 after separate authorization.

### DECISION-P13-006 — Historical counts are evidence baselines

Historical report and manifest counts are evidence baselines, not current production truth. Every output must name its count domain and evidence source.

### DECISION-P13-007 — Manifest/report discrepancy is retained

The Phase 9 narrative states 28 unassigned source objects, while authoritative manifests parse to 398 asset rows, 397 unique source keys, 371 migrate rows, 370 assigned unique keys, and 27 skip/unassigned unique keys. Phase 13 retains both statements, uses manifest parsing for canonical relationships, and defers production confirmation to Phase 14.

### DECISION-P13-008 — Phase 13 production access counters

Phase 13 is completed only if `productionQueries = 0`, `productionAuthenticatedSessions = 0`, `productionMutations = 0`, and `liveWixRecrawls = 0`.
