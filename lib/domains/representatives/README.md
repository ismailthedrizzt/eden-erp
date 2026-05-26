# Representative Authority Domain

Representative Authority Domain owns representative cards and authority transactions/current authority read models.

A representative card is person or organization plus company representative role. Authority is a separate scoped transaction with scope, limits, authority type and status. Branch, organization unit and facility lifecycles are validated here but not owned here.

## Owns

- `company_representatives`
- `company_representative_authority_transactions`
- `v_current_representative_authorities`

## Does Not Own

- Branch lifecycle
- Organization unit hierarchy
- Facility lifecycle
- Partner ownership

## Service Functions

- `getRepresentativeById`
- `findRepresentativeByMasterForCompany`
- `assertUniqueRepresentativeCard`
- `validateAuthorityScope`
- `createAuthorityTransaction`
- `applyAuthorityTransactionFallback`
- `getCurrentAuthority`
- `listRepresentativeAuthoritiesForBranch`
- `listRepresentativeAuthoritiesForCompany`
- `normalizeAuthorityScopeLabel`

## Cross-Domain Rules

- Representative card must not be duplicated for branch, organization or facility scope.
- Scope is stored on authority transaction/current authority, not on the representative card.
- Branch/unit/facility status can be validated, but those records are not mutated here.

## Events

- `representative.created`
- `representative.updated`
- `representative.authority_started`
- `representative.authority_updated`
- `representative.authority_suspended`
- `representative.authority_terminated`
