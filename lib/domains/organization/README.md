# Organization Domain

Organization Domain owns organization units, organization unit types, positions and hierarchy rules.

It may receive branch opening/closing events, but official branch lifecycle remains in Branch Domain. Organization units are hierarchy and staffing structures; they are not branches.

## Owns

- `organization_units`
- `organization_unit_types`
- `positions`
- Organization hierarchy rules

## Does Not Own

- Official branch lifecycle
- Company registration
- Facility physical lifecycle

## Service Functions

- `getOrganizationUnitById`
- `listOrganizationUnitsForCompany`
- `createBranchOrganizationUnit`
- `setOrganizationUnitPassive`
- `reassignOrganizationUnit`
- `keepOrganizationUnitOpenAfterBranchClosing`
- `assertOrganizationUnitBelongsToCompany`
- `assertOrganizationUnitActive`
- `wouldCreateOrganizationCycle`
- `getCompanyRootUnitId`

## Cross-Domain Rules

- Branch opening may ask this service to create an organization unit.
- Branch closing may ask this service to keep, deactivate or reassign the linked unit.
- Organization service must not directly close a branch.

## Events

- `organization.unit_created`
- `organization.unit_updated`
- `organization.unit_closed`
