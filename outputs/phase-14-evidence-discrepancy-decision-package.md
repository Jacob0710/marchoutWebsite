# Phase 14 evidence discrepancy decision package

Status: **UNRESOLVED**. Automation explains the count-domain difference but cannot create the owner's final decision.

## Side-by-side evidence

| Evidence | Count | Count domain | Reference |
| --- | ---: | --- | --- |
| Phase 9 narrative "unassigned" arithmetic | 28 | 398 source asset inventory rows minus 370 assigned unique source identities | `outputs/phase-9-completion-report.md` |
| Authoritative accepted-skip manifest identities | 27 | source-unique asset identities with `disposition=skip` | `migration/phase9/source-inventory.jsonl`; `outputs/phase-13-asset-classification.csv` |

## Identity-list difference

The source inventory contains 398 asset rows but 397 source-unique identities. One assigned attachment identity, `869e8b6837b13c7c75aaf9a8bc4ce473535979e45f529bfe6aad7e8217b02208`, occurs in two `migrate` rows under distinct source URLs. It is an assigned duplicate row, not an additional accepted-skip identity. Therefore `398 - 370 = 28` mixes an inventory-row count with a unique-identity count, while `397 - 370 = 27` compares unique identities consistently. No non-asset row or merged skip identity is needed to explain the one-row difference.

## Production supporting evidence

Gate 2 observed 378 private Storage objects mapped to 370 assigned unique source identities and 8 known multiple-assignment groups. It observed no missing assignment identity, but the 27 accepted-skip identities intentionally have no production Storage assignment. Production evidence supports the assignment side; it cannot decide whether the owner accepts the historical narrative wording.

## Decision boundary

Automation can determine the statistical cause: one duplicate assigned source row and mixed row/unique count domains. Automation cannot choose the owner's historical-report disposition or sign the discrepancy resolution.

Owner options:

1. `accept-manifest-27-canonical` — use 27 as the canonical accepted-skip identity count and annotate the Phase 9 narrative as mixed-domain arithmetic.
2. `retain-both-distinct-domains` — retain 28 only as the historical row-minus-unique arithmetic statement and 27 as the canonical identity count.
3. `request-additional-source-evidence` — keep the discrepancy open pending more owner evidence.
4. `block-cutover` — treat the unresolved discrepancy as a Gate 4 blocker.

| Human field | Value |
| --- | --- |
| final decision |  |
| decision rationale |  |
| reviewer |  |
| reviewed_at |  |
| evidence references confirmed |  |

The final decision fields must remain blank until supplied by the owner.
