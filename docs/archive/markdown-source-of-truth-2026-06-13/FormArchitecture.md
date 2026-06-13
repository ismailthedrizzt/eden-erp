# Eden ERP Form Architecture

Eden ERP forms follow a reference-first rule for records that depend on master identity or reference tables.

## Core Rule

Forms that create role records for people or organizations must resolve the master identity before the rest of the form is editable.

Flow:

1. Reference first.
2. Resolve identity.
3. Prevent duplicates.
4. Activate the form.

## Standard Form Surface

The standard page pattern is:

- `PageBanner`
- optional SmartDataTable widget board
- `SmartDataTable`
- `EntityForm`

`EntityForm` owns the master identity gate and disables hero/detail fields until the gate is resolved.

## Gate Behavior

Before resolution:

- only the master identity gate row is active
- remaining hero fields are disabled
- detail tabs are disabled
- save is disabled

After resolution:

- master fields are prefilled
- master-sourced fields are visually marked
- detail tabs are enabled
- save/update actions are enabled

## Configuration

Forms opt in with `identityGate`:

```ts
identityGate: {
  enabled: true,
  allowedEntityKinds: ['person', 'organization'],
  masterTable: 'both',
  uniqueFields: {
    person: ['nationality', 'national_id', 'passport_no'],
    organization: ['country', 'tax_number', 'registration_number'],
  },
  roleTable: 'sirket_ortaklar',
  roleDuplicateCheck: 'company_id + entity_kind + person_id/organization_id + active',
}
```
