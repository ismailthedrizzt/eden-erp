# Duplicate Prevention

Duplicate prevention happens in two layers.

## Frontend Gate

`MasterIdentityGate` performs a preflight lookup:

- search master identity
- check current role table
- block duplicate create when a role already exists

## Backend Enforcement

Backend endpoints must not rely only on frontend checks. They must enforce duplicate rules during create/update.

Expected examples:

- Employees: `company_id + person_id + active`
- Companies: `organization_id + active`
- Partners: `company_id + person_id/organization_id + active`
- Representatives: `company_id + person_id/organization_id + authority_type + active`
- Stakeholders: `company_id + person_id/organization_id + category + active`

Duplicate role creation should return:

```text
409 Conflict
```

Backend should audit:

- identity search performed
- master found
- master created
- role found
- duplicate blocked
- role created
