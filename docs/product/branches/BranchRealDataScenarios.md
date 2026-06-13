# Branch Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Official Branch Opening

1. Active company exists.
2. User starts Branch Opening.
3. Official branch identity, address and registration fields are entered.
4. Organization unit and facility/location creation are selected.
5. Operation completes.
6. Branch becomes active and appears in `Subelerimiz`.
7. Linked organization unit appears in Organization.
8. Linked facility appears in Facilities/Locations.

Expected result: branch, organization unit, facility, official change transaction, audit and outbox records are created.

## Scenario 2 - Operation Point Opening

1. Active company exists.
2. User starts Branch Opening.
3. Branch type is operation point and `is_official_branch` is false.
4. Registration documents are optional according to configuration.
5. Facility can be created; organization unit can be optional.

Expected result: operation point appears as an active branch-like operational unit without official registration requirements.

## Scenario 3 - Duplicate Active Branch Name

1. Active company has an active branch named `Istanbul Merkez`.
2. User tries to open another active branch with the same name under the same company.

Expected result: operation is blocked or warned according to policy; user sees business language.

## Scenario 4 - Branch Opening Without Facility

1. Facilities module is disabled or not ready.
2. Branch Opening shows facility creation disabled/warning.
3. User continues only if business rules allow branch without facility.

Expected result: branch opens without facility link and branch detail shows a missing facility warning.

## Scenario 5 - Branch Closing With Unit Deactivation

1. Active branch has an organization unit link.
2. User starts Branch Closing.
3. Organization action is `deactivate`.
4. Operation completes.

Expected result: branch becomes closed and organization unit becomes passive/deactivated according to operation rules.

## Scenario 6 - Branch Closing With Unit Reassign

1. Active branch has an organization unit.
2. User chooses `reassign` and selects another active unit under the same company.
3. System checks company scope and hierarchy cycle.

Expected result: branch closes and unit relationship is reassigned without creating a cycle.

## Scenario 7 - Branch Closing With Facility Reuse

1. Active branch has a facility/location link.
2. User chooses to keep facility open and mark reusable.

Expected result: branch closes and facility remains visible in Facilities/Locations as reusable.

## Scenario 8 - Active Representative Authority Impact

1. Active branch has a branch-scoped bank authority.
2. User starts Branch Closing.
3. Precheck displays active representative authority impact.
4. User is routed to Representatives if policy requires termination first.

Expected result: branch closing does not silently invalidate authority records.

## Scenario 9 - Closed Branch Detail

1. User opens a closed branch.
2. Detail view is read-only/history oriented.
3. Closing operation and documents are visible.
4. A new closing action is disabled.

Expected result: no duplicate closing can be started.

## Scenario 10 - Company Branch Summary

1. User opens or closes a branch.
2. Company detail is refreshed.

Expected result: company branch summary counts reflect active, official, operational and closed branch changes.
