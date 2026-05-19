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

- Employees: `person_id`
- Companies: `organization_id + active`
- Partners: `person_id/organization_id`
- Representatives: `company_id + person_id/organization_id + authority_type + active`
- Stakeholders: `person_id/organization_id`

Partners, employees, and stakeholders are role-master records. A person or
organization can have one record in each role list. Company-specific partner
activity is modeled by ownership transactions that point to the existing partner
record, not by creating another partner row.

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
