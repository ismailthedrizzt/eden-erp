# Customer Onboarding E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Coverage
- First login welcome modal
- Workspace checklist rendering
- Workspace profile save
- Module package selection
- Create first company draft CTA
- Draft company empty state
- Company opening recommendation
- Complete tour and persisted state
- Reset help state
- Module setup warning
- Action Guide first company query
- Action Center onboarding item
- Non-admin permission behavior
- Cookie state is not required for critical onboarding state
- Welcome does not reopen after completion

## Seed Data
- New tenant without company
- Tenant with draft company
- Tenant with active company
- Tenant with setup_required module
- Admin user
- Non-admin user

## Manual Flow
1. Login as admin to an empty tenant.
2. Verify welcome modal.
3. Click Kuruluma Basla.
4. Verify Baslangic Merkezi opens.
5. Click Ilk Sirketi Olustur.
6. Verify company create state opens.
7. Save a draft company.
8. Return to dashboard.
9. Verify company opening recommendation.
10. Complete/reset system tour.
11. Ask Action Guide: "Nasil baslayacagim?"
12. Verify Action Center shows onboarding item for admin.
13. Login as non-admin and verify workspace mutation is denied.
14. Reset help state and verify the tour can be started again.

## Playwright Candidate
`tests/e2e/customer-onboarding.spec.ts`

Assertions:
- Welcome modal visible once.
- Checklist progress changes after completing a step.
- Help reset makes tour eligible again.
- Action Guide suggests first company for no-company tenant.
- Non-admin cannot mutate workspace onboarding state.
- Draft company tenant suggests the company opening wizard.
- Active company tenant suggests partner/representative/branch/customer next steps.
