# Phase 14 cutover runbook

Status: **GATE 4 NOT AUTHORIZED — DO NOT EXECUTE**.

## Responsibility matrix

- Owner: content, privacy, Wix, redirect, SEO, and final go/no-go sign-off.
- Production operator: performs only explicitly authorized mutations.
- DNS/domain operator: executes separately approved DNS/domain actions.
- UAT lead: confirms signed UAT evidence and open-issue disposition.
- Rollback operator: independent readiness and execution authority.
- Evidence custodian: retains sanitized hashes/logs and prevents secret leakage.

## T-minus checklist

Require exact approved release, green protected checks, current sanitized inventory/reconciliation, complete 405-row owner review, discrepancy decision, signed UAT, backup/Storage inventory and restore rehearsal, redirect plan, Wix decision, DNS ownership/TTL/window, monitoring, incident contacts, rollback thresholds/operator, and unexpired production mutation authorization. Freeze unrelated changes.

## Authorized sequence

Only after a human go decision: capture pre-state hashes/checkpoints; deploy exact release through the approved path; execute only approved redirect/domain/content actions in bounded batches; verify health, public/draft privacy, scoped assets, canonical/SEO/redirect cases; observe metrics; record sanitized evidence; retain Wix through the rollback window; close only after owner verification.

This runbook itself grants no mutation. Do not merge the Gate 1 Draft PR or create a Phase 14 completion tag as a substitute for later gates.

## No-go and completion

No-go on any missing prerequisite, invalid authorization, secret finding, release drift, failed critical UAT, unresolved privacy/cutover blocker, broken redirect, DNS uncertainty, unavailable rollback operator, or monitoring failure. Final completion requires authorized execution, post-cutover verification, owner sign-off, protected merge, synchronized `main`/remote, and an annotated tag peeled to the final merge.
