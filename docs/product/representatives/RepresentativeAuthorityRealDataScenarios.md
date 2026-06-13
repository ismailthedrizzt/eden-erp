# Representative Authority Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

These scenarios define the product-level regression set for `Temsilcilerimiz`.

## Scenario 1 - Representative card and representation start

1. Start with an active company.
2. Use `+ Ekle` to create a representative card draft.
3. Open `Temsilcilik Baslatma`.
4. Select company-wide signature authority.
5. Enter effective date, signature rule and required document.
6. Complete the wizard.
7. Representative card becomes active and current authority becomes active.

Expected result: card status and authority status are shown separately.

## Scenario 2 - Branch-scoped bank authority

1. Start with an active company and active branch.
2. Create or open a representative card.
3. Start representation with `scope_type = branch`.
4. Select bank authority and bank transaction limit.
5. Complete the wizard.
6. Authority is visible only for the selected branch scope.

Expected result: branch details can include branch-scoped active representatives and company-wide representatives separately.

## Scenario 3 - Organization-unit purchase authority

1. Start with an active organization unit.
2. Create or open a representative card.
3. Select purchase approval authority.
4. Set `scope_type = organization_unit`.
5. Enter purchase approval limit and currency.
6. Complete the wizard.

Expected result: current authority shows organization unit scope and purchase limit.

## Scenario 4 - Facility-scoped operational authority

1. Start with an active facility/location.
2. Create or open a representative card.
3. Select facility scope.
4. Select relevant operational authority type.
5. Complete the wizard.

Expected result: current authority shows facility scope and remains separate from branch/company card fields.

## Scenario 5 - Limit change

1. Open a representative with active authority.
2. Start `Limit Degisikligi`.
3. Change at least one limit.
4. Review old/new values.
5. Complete the wizard.

Expected result: current authority updates and authority history records the transaction.

## Scenario 6 - Suspend and resume

1. Open a representative with active authority.
2. Start `Askiya Alma`.
3. Enter reason and effective date.
4. Complete the wizard.
5. Authority status becomes suspended.
6. Start `Yetki Yenileme / Askidan Kaldirma`.
7. Complete the wizard.
8. Authority status becomes active.

Expected result: representative card can remain active while authority status changes.

## Scenario 7 - Termination

1. Open a representative with active or suspended authority.
2. Start `Sonlandirma`.
3. Enter termination reason, end date and document.
4. Complete the wizard.

Expected result: authority status becomes terminated. Card status and authority status remain separate.

## Scenario 8 - Closed branch is blocked

1. Try to create a branch-scoped authority for a closed or passive branch.
2. Continue to validation.

Expected result: wizard blocks the operation with business language.

## Scenario 9 - Duplicate card is blocked

1. Try to create a second representative card for the same person/organization and company.
2. Submit the create flow.

Expected result: existing card is suggested or duplicate is rejected by backend/front-end identity gate.

## Scenario 10 - Scope change

1. Open a representative with company-wide authority.
2. Start `Yetki Kapsami Degisikligi`.
3. Move authority to a specific active branch.
4. Review old/new scope.
5. Complete the wizard.

Expected result: transaction history shows the scope change and current authority uses the new scope.
