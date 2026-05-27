# Partner Ownership Real Data Scenarios

These scenarios are the minimum product hardening dataset for `Ortaklarimiz`.

## Scenario 1 - Initial Partnership Entry

1. Prepare an active company.
2. Open `/app/sirket/companies/partners`.
3. Use `+ Ekle`.
4. Verify the draft notice says partner rights are not created by the card.
5. Save a partner card draft.
6. Open the draft detail.
7. Start Initial Partnership Entry.
8. Enter share ratio, voting ratio, profit ratio and capital amount.
9. Confirm summary.
10. Verify partner becomes active.
11. Verify current ownership refreshes.

Expected result: the card becomes an active partner only after an ownership transaction.

## Scenario 2 - 100 Percent Distribution

1. Create multiple partner drafts for an active company.
2. Run Initial Partnership Entry for each.
3. Keep total share under or equal to 100%.
4. When total share reaches 100%, verify company/partner ownership summary is complete.
5. Try to add another direct initial ownership entry.

Expected result: new direct ownership is blocked or guided to Share Transfer/Capital Increase when the company ownership is already fully distributed.

## Scenario 3 - Share Transfer

1. Prepare partner A with 60% and partner B with 40%.
2. Open partner A.
3. Start Share Transfer.
4. Transfer 10% from A to B.
5. Confirm before/after table.
6. Complete the transaction.
7. Verify A becomes 50% and B becomes 50%.
8. Verify transaction history shows source and target effects.

Expected result: total share remains 100% and current ownership updates for both partners.

## Scenario 4 - Draft Target Partner Transfer

1. Prepare active partner A and draft partner C in the same company.
2. Start Share Transfer from A to C.
3. Transfer a valid share amount.
4. Complete the transaction.
5. Verify C becomes active.
6. Verify current ownership includes C.

Expected result: draft target can become active through a valid share transfer if business rules allow it.

## Scenario 5 - Ownership Exit

1. Prepare active partner B with positive current share.
2. Start Ownership Exit.
3. Select how B's shares will be transferred or distributed.
4. Confirm impact analysis.
5. Complete the transaction.
6. Verify B becomes passive and has an end date.
7. Verify remaining partners retain a valid total share distribution.

Expected result: active partner is not hard deleted; exit is recorded as an ownership transaction.

## Scenario 6 - Single Owner Exit Block

1. Prepare a single-owner company.
2. Open the active partner.
3. Start Ownership Exit without a new partner or transfer plan.
4. Review blocking message.

Expected result: the system blocks ownership exit because the company cannot be left without an owner.

## Scenario 7 - Capital Increase Impact

1. Prepare two active partners with 50% / 50%.
2. Complete a proportional Capital Increase from Companies.
3. Return to `Ortaklarimiz`.
4. Verify each partner's capital amount increased.
5. Verify share ratio remains stable when proportional distribution is used.
6. Verify history references the capital increase/ownership impact transaction.

Expected result: partner list and detail current ownership reflect capital increase effects.

## Scenario 8 - Correction / Reversal

1. Create an incorrect share transfer transaction in a test dataset.
2. Open the affected partner.
3. Start Correction Record or Reversal.
4. Select/reference the previous transaction where supported.
5. Enter a reason.
6. Review before/after ownership impact.
7. Complete only if current ownership remains valid.

Expected result: correction/reversal is auditable and does not leave invalid current ownership.

## Scenario 9 - Locked Field Attempt

1. Open an active partner.
2. Try to edit share/vote/profit/capital fields through card edit or API.
3. Verify UI helper points to ownership operations.
4. Verify backend returns `OPERATION_CONTROLLED_FIELDS`.

Expected result: rights fields are never changed through partner card PATCH.
