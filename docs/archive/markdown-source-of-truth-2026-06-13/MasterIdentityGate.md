# MasterIdentityGate

`MasterIdentityGate` is the reusable gate component used by `EntityForm`.

## Responsibilities

- entity kind selection
- identity input
- master record lookup
- duplicate role lookup
- form activation
- prefill from master data
- duplicate navigation decision

## Supported Kinds

- `person`: Gercek Kisi
- `organization`: Tuzel Kisi

Forms can restrict allowed kinds:

- Employees: `['person']`
- Companies: `['organization']`
- Partners, Representatives, Stakeholders: `['person', 'organization']`

## State Machine

Supported states:

- `initial`
- `identity_input`
- `searching_master`
- `master_not_found`
- `master_found`
- `role_checking`
- `role_not_found`
- `role_found`
- `ready_for_insert`
- `ready_for_edit`
- `blocked_duplicate`

## Duplicate Handling

When a role record already exists, the gate blocks duplicate creation and offers:

- `Evet, Duzenle`
- `Hayir, Kapat`

The parent page decides how to open the existing record.
