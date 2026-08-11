# Phase 14 administrator UAT checklist

Status: **NOT EXECUTED — HUMAN RESULT FIELDS MUST REMAIN BLANK UNTIL UAT**.

| ID | Scenario | Expected result | Human result | Tester | Executed at | Evidence | Issue/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UAT-01 | Administrator login and logout | Correct login succeeds; logout clears access |  |  |  |  |  |
| UAT-02 | Session persistence and expiry | Valid session persists; expired session fails closed |  |  |  |  |  |
| UAT-03 | Unauthorized/inactive access | Page/API reads and mutations are denied |  |  |  |  |  |
| UAT-04 | Create Activity | One scoped draft is created once |  |  |  |  |  |
| UAT-05 | Edit and save draft | Valid fields persist; errors are safe |  |  |  |  |  |
| UAT-06 | Publish Activity | Approved draft becomes public once |  |  |  |  |  |
| UAT-07 | Unpublish Activity | Public route becomes unavailable |  |  |  |  |  |
| UAT-08 | Image upload | Supported image stores privately and proxies safely |  |  |  |  |  |
| UAT-09 | Attachment upload/download | Supported attachment proxies/downloads safely |  |  |  |  |  |
| UAT-10 | Cover set/replace/remove | Cover relation and proxy remain consistent |  |  |  |  |  |
| UAT-11 | Image ordering | Order persists and public display matches |  |  |  |  |  |
| UAT-12 | External video | Valid HTTPS link displays; invalid input fails |  |  |  |  |  |
| UAT-13 | Draft disclosure boundary | Draft data/assets are not publicly reachable |  |  |  |  |  |
| UAT-14 | Public content and asset proxy | Published page/proxy show only approved data |  |  |  |  |  |
| UAT-15 | Mobile viewport/keyboard | Layout and controls remain usable |  |  |  |  |  |
| UAT-16 | Browser matrix | Required browsers meet critical flows |  |  |  |  |  |
| UAT-17 | Error states | Network/database/validation errors fail safely |  |  |  |  |  |
| UAT-18 | Duplicate submission | Idempotence or visible conflict prevents duplicates |  |  |  |  |  |
| UAT-19 | Large/empty/unsupported file | Upload rejected without orphan object |  |  |  |  |  |
| UAT-20 | Owner content spot check | Human owner confirms selected content |  |  |  |  |  |
| UAT-21 | Personal/sensitive content | Human privacy review confirms or blocks |  |  |  |  |  |
| UAT-22 | Audit evidence | Sanitized evidence is complete and traceable |  |  |  |  |  |
| UAT-23 | Cleanup and rollback | Disposable data cleanup and rollback readiness verified |  |  |  |  |  |

Final owner UAT decision:

Owner:

Decided at:

Evidence bundle hash:

Open blockers:
