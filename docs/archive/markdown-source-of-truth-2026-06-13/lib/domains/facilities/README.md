# Facility / Location Domain

Facility Domain owns physical locations, facility records and facility lifecycle.

A facility can be linked to a branch, but it is not the branch itself. Official branch opening and closing stay in Branch Domain.

## Owns

- `company_facilities`
- Facility/location lifecycle
- Physical address/location metadata

## Does Not Own

- Official branch opening/closing
- Organization hierarchy
- Company legal identity

## Service Functions

- `getFacilityById`
- `listFacilitiesForCompany`
- `createFacilityForBranch`
- `linkFacilityToBranch`
- `setFacilityPassive`
- `keepFacilityOpenAfterBranchClosing`
- `markFacilityReusable`
- `assertFacilityBelongsToCompany`
- `assertFacilityActive`
- `buildFacilityDisplayLabel`

## Cross-Domain Rules

- Branch opening may ask this service to create or link a physical location.
- Branch closing may ask this service to deactivate, keep open or mark reusable.
- Facility service must not directly change official branch status.

## Events

- `facility.created`
- `facility.linked_to_branch`
- `facility.deactivated`
