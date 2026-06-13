# UI Template Simplification Report

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Scope Reviewed
Release/field-test UI surfaces were reviewed through boundary warnings: Action Center, documents, audit, company/partner/representative tabs, accounting modal and HR/accounting pages.

## Action Taken
No UI rewrite was performed. Boundary false positives around client service facades were corrected so real UI/template debt is visible.

## Remaining UI Debt
- P1: AI Action Guide search component still imports backend-core helper code and should be split or moved to a client facade.
- P1/P2: legacy `/app/ik/personel` remains development while `/app/ik/calisanlar` is canonical.
- P2: placeholder/demo pages remain buildable but release-hidden/development.
