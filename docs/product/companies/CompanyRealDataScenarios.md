# Company Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

These scenarios are the minimum product hardening dataset for `Sirketlerimiz`.

## Scenario 1 - New Company Foundation

1. Open `/app/sirket/companies`.
2. Use `+ Ekle`.
3. Verify the draft notice says the action creates a company card draft.
4. Fill identity, contact and draft address fields.
5. Save the draft.
6. Open the draft detail.
7. Start Company Opening.
8. Complete opening with foundation, registry and document data.
9. Verify the company becomes active.
10. Verify official fields are locked after activation.

Expected result: active company detail refreshes, lifecycle history contains opening, audit/outbox records are created where backend infrastructure is enabled.

## Scenario 2 - Active Company Address Change

1. Open an active company.
2. Verify address fields are locked in normal edit.
3. Open the field helper or operation actions.
4. Start Address Change.
5. Enter a new address with city/district.
6. Confirm summary.
7. Complete the wizard.
8. Verify detail shows the new address.
9. Verify history/audit/official change transaction exists.

Expected result: normal PATCH rejects address edits with `OPERATION_CONTROLLED_FIELDS`; wizard path succeeds.

## Scenario 3 - Capital Increase

1. Prepare an active company with current ownership totaling 100%.
2. Open Capital Increase precheck.
3. Verify partners/current ownership readiness is green.
4. Enter old capital, increase amount and new capital.
5. Choose automatic proportional distribution.
6. Review before/after partner table and rounding.
7. Complete the wizard.
8. Verify company capital updates.
9. Verify ownership transactions and current ownership are refreshed.

Expected result: missing current ownership blocks the operation with business-language guidance.

## Scenario 4 - Branch Opening

1. Open an active company detail.
2. Start Branch Opening.
3. Enter branch identity, official branch flag, address and registration data.
4. Choose organization unit and facility creation/link behavior.
5. Confirm summary.
6. Complete the operation.
7. Verify the branch appears in `Subelerimiz`.
8. Verify organization/facility records are visible if created.

Expected result: branch is not created through free POST; only official opening operation creates it.

## Scenario 5 - Branch Closing

1. Open a company with at least one active branch.
2. Start Branch Closing.
3. Select the active branch.
4. Review representative, organization, staff and facility impact warnings.
5. Choose organization unit action.
6. Choose facility action.
7. Complete the operation.
8. Verify branch status is closed and related unit/facility follow selected behavior.

Expected result: active branch direct delete is rejected; closing operation records history/audit.

## Scenario 6 - NACE and Activity Subject Distinction

1. Open an active company.
2. Start NACE / Activity Code Update.
3. Select a change that implies activity subject change.
4. Verify the UI redirects or suggests Activity Subject Change.
5. Complete Activity Subject Change with valid dates and summary.
6. Verify NACE and activity history are correct.

Expected result: NACE code changes and activity subject changes remain distinct operations.

## Scenario 7 - Liquidation and Deregistration

1. Open an active company.
2. Start Liquidation precheck.
3. Verify open branch, active representative, open process/task and facility warnings.
4. Resolve blockers or acknowledge warnings according to policy.
5. Complete Liquidation.
6. Start Deregistration precheck.
7. Verify open branches/active authorities/open tasks block deregistration.
8. Complete Deregistration after blockers are cleared.

Expected result: deregistered company is read-only and preserved for history/audit.

## Scenario 8 - Draft Hard Delete

1. Create a company draft.
2. Do not attach partners, representatives, branches, operations or documents.
3. Delete the draft.
4. Verify success message: `Sirket taslak kaydi kalici olarak silindi.`
5. Create another draft and attach related data.
6. Try delete.

Expected result: clean draft hard delete succeeds; related/operation-history record is rejected.
